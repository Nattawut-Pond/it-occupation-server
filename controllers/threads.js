const express = require('express');
const db = require('./database/initDatabase.js');
const router = express.Router();

// Handler to get threads
const getThreads = (req, res) => {
    const query = 'SELECT * FROM threads ORDER BY created_at DESC';

    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching threads:', err);
            return res.status(500).json({ message: 'Failed to retrieve threads' });
        }
        res.status(200).json(result);
    });
};

// Handler to create a new thread
const postThreads = (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
    }

    const query = 'INSERT INTO threads (title, content, created_at) VALUES (?, ?, NOW())';
    db.query(query, [title, content], (err, result) => {
        if (err) {
            console.error('Error creating thread:', err);
            return res.status(500).json({ message: 'Failed to create thread' });
        }
        res.status(201).json({ message: 'Thread created successfully', threadId: result.insertId });
    });
};

// Routes
router.get('/api/threads', getThreads);
router.post('/api/threads_post', postThreads);

module.exports = router;
