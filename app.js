require('dotenv').config()
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { createRateLimiter } = require('./rateLimit/rateLimit.js');

// setting up express
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000,
  acquireTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxReconnects: 10,
  timeout: 60000
};

let db;
let retryCount = 0;
const MAX_RETRIES = 10;

async function connectDB() {
  try {
    if (!process.env.MYSQLHOST || !process.env.MYSQLUSER || !process.env.MYSQLPASSWORD || !process.env.MYSQLDATABASE) {
      throw new Error('Database configuration environment variables are missing');
    }

    console.log('Attempting to connect to database...');
    db = mysql.createPool(dbConfig);
    
    // Test the connection with timeout
    const connection = await Promise.race([
      db.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      )
    ]);
    
    await connection.ping();
    connection.release();
    
    console.log('Database connected successfully');
    retryCount = 0; // Reset retry count on successful connection
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
    retryCount++;
    
    if (retryCount < MAX_RETRIES) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff with max 30s
      console.log(`Retrying connection in ${retryDelay/1000} seconds... (Attempt ${retryCount} of ${MAX_RETRIES})`);
      setTimeout(connectDB, retryDelay);
    } else {
      console.error('Max retry attempts reached. Please check your database configuration and connectivity.');
    }
  }
}

// Initial connection attempt
connectDB();

// Add connection error handler with reconnection logic
process.on('unhandledRejection', (err) => {
  console.error('Unhandled database error:', err);
  if (db) {
    console.log('Attempting to reconnect to database...');
    retryCount = 0; // Reset retry count for new connection attempt
    connectDB();
  }
});

// Add periodic ping to keep connection alive
setInterval(async () => {
  try {
    if (db) {
      const connection = await db.getConnection();
      await connection.ping();
      connection.release();
    }
  } catch (error) {
    console.error('Ping failed, attempting to reconnect:', error);
    connectDB();
  }
}, 30000); // Ping every 30 seconds

// Import 
const middleWare = require('./Middleware/middleWare.js');
const userRouter = require('./routes/userRouter.js');

// App use 
app.use(express.json());
app.use(middleWare.keepLog);
app.use(createRateLimiter());
app.use(cors());

// Routes
app.use('/api', userRouter);

app.get('/api/videospath', async (req, res) => {
    try {
        const query = 'SELECT video_title, video_path, description, image FROM videospath';
        const [results] = await db.query(query);
        if (results.length > 0) {
            res.json({ results }); 
        } else {
            res.status(404).send('No videos found.');
        }
    } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/videospath-post', async (req, res) => {
    const { video_title, video_path, description, image } = req.body;

    // Validate input
    if (!video_title || !video_path || !description || !image) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const query = `INSERT INTO videospath (video_title, description, video_path, image) VALUES (?, ?, ?, ?)`;
        const [result] = await db.execute(query, [video_title, video_path, description, image]);
        res.status(201).json({ message: 'Video added successfully!', videoId: result.insertId });
    } catch (error) {
        console.error('Error adding video:', error); // Log the error to see the details
        res.status(500).json({ message: 'Server error.', error: error.message }); // Include error message in response
    }
});

// Form counts

app.get('/api/form-submission-counts', async (req, res) => {
    try {
        // Query for the count of today's submissions
        const [todayResult] = await db.promise().query(`
        SELECT COUNT(*) AS count
        FROM form_submissions
        WHERE DATE(submitted_at) = CURDATE()
      `);

        // Query for the count of yesterday's submissions
        const [yesterdayResult] = await db.promise().query(`
        SELECT COUNT(*) AS count
        FROM form_submissions
        WHERE DATE(submitted_at) = CURDATE() - INTERVAL 1 DAY
      `);

        // Query for the count of all-time submissions
        const [allTimeResult] = await db.promise().query(`
        SELECT COUNT(*) AS count
        FROM form_submissions
      `);

        res.json({
            today: todayResult[0].count,
            yesterday: yesterdayResult[0].count,
            allTime: allTimeResult[0].count,
        });
    } catch (error) {
        console.error('Error fetching form submission counts:', error);
        res.status(500).json({ message: 'Error fetching form submission counts.' });
    }
});

// form submit
app.post('/api/form-submissions', async (req, res) => {
    try {
        const { submitted_at } = req.body;

        // Insert the submission record with the current timestamp
        await db.promise().query(`
        INSERT INTO form_submissions (submitted_at)
        VALUES (?)
      `, [submitted_at]);

        res.status(200).json({ message: 'Form submitted successfully' });
    } catch (error) {
        console.error('Error saving form submission:', error);
        res.status(500).json({ message: 'Error saving form submission' });
    }
});

app.get('/api/threads', async (req, res) => {
    try {
        const query = 'SELECT * FROM threads ORDER BY created_at DESC';
        const [results] = await db.query(query);
        res.status(200).json(results);
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้:', err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});

app.get('/api/comments/:thread_id', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const query = 'SELECT * FROM comments WHERE thread_id = ? ORDER BY created_at DESC';
        const [results] = await db.query(query, [thread_id]);
        res.status(200).json(results);
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการดึงความคิดเห็น:', err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});

app.post('/api/threads_post', async (req, res) => {
    try {
        const { title, content } = req.body;
        const query = 'INSERT INTO threads (title, content) VALUES (?, ?)';
        await db.query(query, [title, content]);
        res.status(201).json({ message: 'กระทู้ถูกสร้างสำเร็จ' });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการบันทึกกระทู้:', err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});

app.post('/api/comments', async (req, res) => {
    try {
        const { thread_id, user_name, comment } = req.body;
        const query = 'INSERT INTO comments (thread_id, user_name, comment) VALUES (?, ?, ?)';
        await db.query(query, [thread_id, user_name, comment]);
        res.status(201).json({ message: 'ความคิดเห็นถูกบันทึกสำเร็จ' });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการบันทึกความคิดเห็น:', err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});

// Listen
app.listen(PORT, () => {
    console.log('\x1b[31m');
    console.log(`
 
        ██╗ █████╗ ██╗   ██╗    ███████╗██╗  ██╗██████╗ ██████╗ ███████╗███████╗███████╗
        ██║██╔══██╗╚██╗ ██╔╝    ██╔════╝╚██╗██╔╝██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝
        ██║███████║ ╚████╔╝     █████╗   ╚███╔╝ ██████╔╝██████╔╝█████╗  ███████╗███████╗
   ██   ██║██╔══██║  ╚██╔╝      ██╔══╝   ██╔██╗ ██╔═══╝ ██╔══██╗██╔══╝  ╚════██║╚════██║
   ╚█████╔╝██║  ██║   ██║       ███████╗██╔╝ ██╗██║     ██║  ██║███████╗███████║███████║
    ╚════╝ ╚═╝  ╚═╝   ╚═╝       ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝
                                                                                        
   [jay] Running on http://localhost:${process.env.PORT || 3000}
                                                                        `);

})