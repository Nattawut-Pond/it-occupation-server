const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: true,
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 1,
  maxIdle: 1,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let db = null;
let isConnecting = false;
let retryCount = 0;
const MAX_RETRIES = 5;

async function connectDB() {
  if (isConnecting) return;
  
  try {
    isConnecting = true;
    
    if (!process.env.MYSQLHOST || !process.env.MYSQLUSER || !process.env.MYSQLPASSWORD || !process.env.MYSQLDATABASE) {
      throw new Error('Database configuration environment variables are missing');
    }

    console.log('Attempting to connect to database...');
    
    // Create a new pool
    const pool = mysql.createPool(dbConfig);
    
    // Test the connection with a timeout
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      )
    ]);

    // Test the connection
    await connection.ping();
    connection.release();
    
    // If we get here, connection is successful
    db = pool;
    console.log('Database connected successfully');
    retryCount = 0;
    isConnecting = false;
    
    return db;
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
    isConnecting = false;
    retryCount++;
    
    if (retryCount < MAX_RETRIES) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`Retrying connection in ${retryDelay/1000} seconds... (Attempt ${retryCount} of ${MAX_RETRIES})`);
      return new Promise(resolve => {
        setTimeout(() => resolve(connectDB()), retryDelay);
      });
    } else {
      console.error('Max retry attempts reached. Please check your database configuration and connectivity.');
      process.exit(1);
    }
  }
}

async function executeQuery(query, params = []) {
  try {
    if (!db) {
      db = await connectDB();
    }
    return await db.execute(query, params);
  } catch (error) {
    console.error('Query error:', error.message);
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET') {
      console.log('Connection lost. Attempting to reconnect...');
      db = null;
      db = await connectDB();
      return await db.execute(query, params);
    }
    throw error;
  }
}

// Initial connection
connectDB().catch(err => {
  console.error('Initial connection failed:', err);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
  if (db) {
    console.log('Closing database connection pool...');
    await db.end();
  }
  process.exit(0);
});

module.exports = {
  executeQuery,
  connectDB
};