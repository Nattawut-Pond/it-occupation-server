const { databaseConnection } = require("../database/initDatabase.js");
const express = require('express');
const router = express.Router();

// ฟังก์ชั่น นำวิดีโอออกมาโผล่ใน Front-End
exports.getAllVideos = async (request, res) => {
    const connection = databaseConnection();
    try {
        connection.query("SELECT * FROM videospath", (error, results) => {
            if (results.length === 0) {
                res.json({ message: "Not Found" });
            } else {
                res.json({
                    message: "Find videos success",
                    results: results,
                });
            }
            if (error) {
                res.json({ message: error.message, error: error });
            }
        });
    } catch (error) {

    }
};

