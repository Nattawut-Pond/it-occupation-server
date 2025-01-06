const { databaseConnection } = require("../database/initDatabase.js");


exports.getAllOccupation = async (request, res) => {
    const connection = databaseConnection();
    try {
        connection.query("SELECT * FROM occupation", (error, results) => {  
            if (results.length === 0) {
                res.json({ message: "Not Found" });
            } else {
                res.json({
                    message: "Find occupation success",
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

exports.getQuestionByOccupation = async (request, res) => {
    const connection = databaseConnection();
    if (!request.params.id) {
        res.json({ message: "Please provide occupation id" });
        return;
    }

    try {
        connection.query("SELECT * FROM question WHERE question_type = ?", [request.params.id], (error, results) => {  
            if (results.length === 0) {
                res.json({ message: "Not Found" });
            } else {
                res.json({
                    message: "Find question success",
                    results: results,
                });
            }
            if (error) {
                res.json({ message: error.message, error: error });
            }
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message, error: error });
    }

}