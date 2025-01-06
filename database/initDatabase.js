const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    rejectUnauthorized: false
  }
};

let connection = null;

async function connectDB() {
  try {
    console.log('Attempting to connect to database...');
    
    // Create a single connection instead of a pool
    connection = await mysql.createConnection(dbConfig);
    
    // Handle disconnects
    connection.on('error', async (err) => {
      console.log('Database connection error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        connection = null;
        await connectDB();
      }
    });

    console.log('Database connected successfully');
    return connection;
  } catch (err) {
    console.error('Connection error:', err.message);
    connection = null;
    // Wait 5 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectDB();
  }
}

async function executeQuery(query, params = []) {
  try {
    if (!connection) {
      await connectDB();
    }
    
    const [results] = await connection.execute(query, params);
    return [results];
  } catch (error) {
    console.error('Query error:', error.message);
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET') {
      connection = null;
      await connectDB();
      const [results] = await connection.execute(query, params);
      return [results];
    }
    throw error;
  }
}

// Initial connection
connectDB().catch(console.error);

module.exports = {
  executeQuery,
  connectDB
};