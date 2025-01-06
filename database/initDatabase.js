const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 10000,
  connectionLimit: 1,
  maxIdle: 1,
  enableKeepAlive: true
};

let connection = null;
let isConnecting = false;

async function validateConnection() {
  try {
    if (!connection) return false;
    await connection.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

async function connectWithTimeout() {
  return Promise.race([
    mysql.createConnection(dbConfig),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    )
  ]);
}

async function connectDB() {
  if (isConnecting) {
    console.log('Already attempting to connect...');
    return connection;
  }

  try {
    isConnecting = true;
    console.log('Attempting to connect to database with config:', {
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT
    });
    
    // Try to connect with timeout
    connection = await connectWithTimeout();
    
    // Test the connection
    await connection.query('SELECT 1');
    
    connection.on('error', async (err) => {
      console.log('Database connection error:', err.message);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
        connection = null;
        isConnecting = false;
      }
    });

    console.log('Database connected successfully');
    isConnecting = false;
    return connection;
  } catch (err) {
    console.error('Connection error:', err.message);
    connection = null;
    isConnecting = false;
    
    // Wait before retrying
    console.log('Waiting 5 seconds before retry...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectDB();
  }
}

async function executeQuery(query, params = []) {
  try {
    // Validate existing connection
    const isValid = await validateConnection();
    if (!isValid) {
      console.log('Connection invalid or not exists, reconnecting...');
      await connectDB();
    }
    
    const [results] = await connection.execute(query, params);
    return [results];
  } catch (error) {
    console.error('Query error:', error.message);
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET') {
      console.log('Connection lost, reconnecting...');
      connection = null;
      await connectDB();
      const [results] = await connection.execute(query, params);
      return [results];
    }
    throw error;
  }
}

// Initial connection
console.log('Initializing database connection...');
connectDB().catch(err => {
  console.error('Initial connection failed:', err.message);
});

module.exports = {
  executeQuery,
  connectDB
};