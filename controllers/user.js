const { databaseConnection } = require("../database/initDatabase.js");

exports.getUserById = async (request, res) => {
  const id = request.params.id;

  const connection = databaseConnection();
  try {
    connection.query(
      "SELECT * FROM users WHERE id = ?",
      [id],
      (error, results) => {
        if (results.length === 0) {
          res.json({ message: "Not Fouind" });
        } else {
          res.json({
            message: "find user success",
            id: request.params.id,
            results: results,
          });
        }
  
        if (error) {
          res.json({ message: error.message, error: error });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message, error: error });
  }
};

exports.loginUser = async (request, res) => {
  console.log("loginUser -> request.body", request.body);
  if (!request.body.email || !request.body.password) {
    res.json({ message: "Please provide email and password" });
    return;
  }

  const { email, password } = request.body;
  const connection = databaseConnection();

  try {
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      (error, results) => {
        // if ()
        if (!results || results.length === 0) {
          setTimeout(() => {
            res.status(500).json({ message: "ไม่พบผู้ใช้งานนี้ในระบบ" });
          }, 500);
        } else {
          connection.query(
            "SELECT * FROM users WHERE email = ? AND password = ?",
            [email, password],
            (error, results) => {
              if (!results || results.length === 0) {
                // res.json({ message: "Not Found" }).status(500);
                setTimeout(() => {
                  res.status(500).json({ message: "ไม่พบผู้ใช้งานนี้ในระบบ" });
                }, 500);
              } else {
                setTimeout(() => {
                  res.json({
                    message: "Login success",
                    results: results,
                  });
                }, 500);
              }
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message, error: error });
  }
};

exports.createUser = async (req, res) => {
  if (
    !req.body.email ||
    !req.body.password ||
    !req.body.lname ||
    !req.body.fname
  ) {
    res.json({ message: "Please provide email and password" });
    return;
  }

  const connection = databaseConnection();
  const { email, password, lname, fname } = req.body;
  if (connection) {
    try {
      connection.query(
        "SELECT * FROM users WHERE email = ? AND fname = ? AND lname = ?",
        [email, fname, lname],
        (error, results) => {
          if (results.length === 0) {
            connection.query(
              "INSERT INTO users (email, password, lname, fname) VALUES (?, ?, ?, ?)",
              [email, password, lname, fname],
              (error, results) => {
                if (error) {
                  res.json({ message: error.message, error: error });
                } else {
                  setTimeout(() => {
                    res.json({
                      message: "Create user success",
                      userInfo: results,
                    });
                  }, 1500);
                }
              }
            );
          } else {
            res.json({ message: "มีผู้ใช้แล้ว" });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ message: error.message, error: error });
    }
  } else {
    res.json({ message: "Database connection error" });
  }
};
