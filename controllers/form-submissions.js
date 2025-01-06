const { databaseConnection } = require("../database/initDatabase.js");
const express = require('express');
const router = express.Router();

exports.formsubmissions = async (req, res) => {
    const connection = databaseConnection();

    try {
        connection.query("SELECT submitted_at FROM form_submissions", (error, results) => {
            if (error) {
                return res.status(500).json({ message: "Database error", error: error.message });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "No submissions found" });
            }

            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            // Initialize counts
            let todayCount = 0;
            let yesterdayCount = 0;
            const allTimeCount = results.length;

            // Calculate counts
            results.forEach((row) => {
                if (row.submitted_at) {
                    const submissionDate = new Date(row.submitted_at);
                    if (
                        submissionDate.getFullYear() === today.getFullYear() &&
                        submissionDate.getMonth() === today.getMonth() &&
                        submissionDate.getDate() === today.getDate()
                    ) {
                        todayCount++;
                    } else if (
                        submissionDate.getFullYear() === yesterday.getFullYear() &&
                        submissionDate.getMonth() === yesterday.getMonth() &&
                        submissionDate.getDate() === yesterday.getDate()
                    ) {
                        yesterdayCount++;
                    }
                }
            });

            // Return the aggregated counts
            res.json({
                message: "Form submission counts",
                today: todayCount,
                yesterday: yesterdayCount,
                allTime: allTimeCount,
            });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};