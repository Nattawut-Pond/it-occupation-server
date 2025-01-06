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
  connectTimeout: 20000,
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  multipleStatements: true
};

let db;
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
    
    const pool = mysql.createPool(dbConfig);
    
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    db = pool;
    console.log('Database connected successfully');
    retryCount = 0;
    isConnecting = false;
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
        db = null;
        setTimeout(connectDB, 5000);
      }
    });
    
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
    isConnecting = false;
    retryCount++;
    
    if (retryCount < MAX_RETRIES) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`Retrying connection in ${retryDelay/1000} seconds... (Attempt ${retryCount} of ${MAX_RETRIES})`);
      setTimeout(connectDB, retryDelay);
    } else {
      console.error('Max retry attempts reached. Please check your database configuration and connectivity.');
      process.exit(1);
    }
  }
}

async function executeQuery(query, params = []) {
  try {
    if (!db) {
      await connectDB();
    }
    return await db.query(query, params);
  } catch (error) {
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
      db = null;
      await connectDB();
      return await db.query(query, params);
    }
    throw error;
  }
}

// Initial connection
connectDB();

module.exports = {
  executeQuery,
  connectDB
};