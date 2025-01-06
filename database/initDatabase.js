const express = require('express');
const mysql = require('mysql2');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

exports.databaseConnection = () => {

  app.use(cors());
  app.use(bodyParser.json());

  try {
    const db = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'it_occupation'
    });
    return db;
  } catch (error) {
    console.log(error.message);
  }

  // Api register
  // เริ่มต้น Checking Email

  app.post('/api/register', [
    check('email').isEmail().withMessage('Please enter a valid email address'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    try {
        // Log incoming request
        console.log('Registration attempt:', req.body);

        // Handle validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Check if email exists
        const [existingUser] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            console.log('Email already exists:', email);
            return res.status(400).json({ message: 'Email is already in use.' });
        }

        // Hash password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user with hashed password
        await db.promise().query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);

        console.log('User registered successfully:', email);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Detailed registration error:', error);
        res.status(500).json({ 
            message: 'Error registering user.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

  // หา api route ของ videospath ที่สร้างไว้
  app.get('/api/videospath', async (req, res) => {
    try {
      // Query to fetch videos
      const [videos] = await db.query('SELECT id, title, description, moreInfo, image FROM videos');
      res.json({ results: videos });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ message: 'Failed to fetch videos from the database.' });
    }
  });

  app.post('/api/videospath_post', async (req, res) => {
    const { video_title, video_path, description, image } = req.body;

    if (!video_title || !video_path || !description || !image) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
      const [result] = await db.promise().query(
        'INSERT INTO videospath (video_title, video_path, description, image) VALUES (?, ?, ?, ?)',
        [video_title, video_path, description, image]
      );
      res.status(201).json({ message: 'Video added successfully!', videoId: result.insertId });
    } catch (error) {
      console.error('Database Error:', error);
      res.status(500).json({ message: 'Error inserting video into the database.' });
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
      res.status(400).json({ message: 'กระทู้ถูกสร้างสำเร็จ' });
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
      res.status(400).json({ message: 'ความคิดเห็นถูกบันทึกสำเร็จ' });
    });
  });



  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });




};