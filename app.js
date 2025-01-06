require('dotenv').config()

const express = require('express');
const cors = require('cors');
const { createRateLimiter } = require('./rateLimit/rateLimit.js');
// const { databaseConnection } = require('./database/initDatabase.js');   

// databaseConnection();
// setting up express
const app = express();
const PORT = process.env.PORT || 3000;


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


app.get('/api/videospath', (req, res) => {
    const query = 'SELECT video_title, video_path, description, image FROM videospath';
    db.query(query, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.json({ results: result }); // Return an array of video objects
        } else {
            res.status(404).send('No videos found.');
        }
    });
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

app.get('/api/threads', (req, res) => {
    const query = 'SELECT * FROM threads ORDER BY created_at DESC';
    db.query(query, (err, result) => {
        if (err) {
            console.error('เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้:', err);
            return res.status(500).send('เกิดข้อผิดพลาด');
        }
        res.status(200).json(result);
    });
});

app.get('/api/comments/:thread_id', (req, res) => {
    const { thread_id } = req.params;
    const query = 'SELECT * FROM comments WHERE thread_id = ? ORDER BY created_at DESC';
    db.query(query, [thread_id], (err, result) => {
        if (err) {
            console.error('เกิดข้อผิดพลาดในการดึงความคิดเห็น:', err);
            return res.status(500).send('เกิดข้อผิดพลาด');
        }
        res.status(200).json(result);
    });
});


app.post('/api/threads_post', (req, res) => {
    const { title, content } = req.body;
    const query = 'INSERT INTO threads (title, content) VALUES (?, ?)';
    db.query(query, [title, content], (err, result) => {
        if (err) {
            console.error('เกิดข้อผิดพลาดในการบันทึกกระทู้:', err);
            return res.status(500).send('เกิดข้อผิดพลาด');
        }
        res.status(201).json({ message: 'กระทู้ถูกสร้างสำเร็จ' });
    });
});

app.post('/api/comments', (req, res) => {
    const { thread_id, user_name, comment } = req.body;
    const query = 'INSERT INTO comments (thread_id, user_name, comment) VALUES (?, ?, ?)';
    db.query(query, [thread_id, user_name, comment], (err, result) => {
        if (err) {
            console.error('เกิดข้อผิดพลาดในการบันทึกความคิดเห็น:', err);
            return res.status(500).send('เกิดข้อผิดพลาด');
        }
        res.status(201).json({ message: 'ความคิดเห็นถูกบันทึกสำเร็จ' });
    });
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

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to database');
});