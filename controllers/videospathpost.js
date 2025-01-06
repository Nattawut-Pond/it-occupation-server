const express = require('express');
const router = express.Router();
const db = require('./database/initDatabase.js');

// POST /api/videospath
exports.routerVideos = async (request, res) => {
    router.post('/api/videospath', async (req, res) => {
        const { video_title, video_path, description, image } = req.body;

        if (!video_title || !video_path || !description || !image) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        try {
            const query = 'INSERT INTO videospath (video_title, video_path, description, image) VALUES (?, ?, ?, ?)';
            await db.query(query, [video_title, video_path, description, image]);
            res.status(201).json({ message: 'Video added successfully!' });
        } catch (error) {
            console.error('Error adding video:', error);
            res.status(500).json({ message: 'Server error.' });
        }
    })
};
