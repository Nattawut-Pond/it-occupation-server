const express = require('express');
const router = express.Router();
const { databaseConnection } = require("../database/initDatabase.js");

exports.formPost = async (req, res) => {
    try {
        const { submitted_at } = req.body;

        // Validate the input
        if (!submitted_at) {
            return res.status(400).json({ message: 'Missing submitted_at field' });
        }

        const connection = databaseConnection();

        // Use the database connection to execute the query
        await connection.promise().query(`
            INSERT INTO form_submissions (submitted_at)
            VALUES (?)
        `, [submitted_at]);

        res.status(200).json({ message: 'Form submitted successfully' });
    } catch (error) {
        console.error('Error saving form submission:', error);
        res.status(500).json({ message: 'Error saving form submission' });
    }
};

