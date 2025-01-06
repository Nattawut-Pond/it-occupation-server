const bcrypt = require('bcrypt');
const { executeQuery } = require("../database/initDatabase.js");

exports.getUserById = async (request, res) => {
  try {
    const id = request.params.id;
    const [results] = await executeQuery("SELECT * FROM users WHERE id = ?", [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove sensitive information
    const user = results[0];
    delete user.password;
    
    res.json({
      message: "User found successfully",
      user: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.loginUser = async (request, res) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Get user by email
    const [users] = await executeQuery("SELECT * FROM users WHERE email = ?", [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];
    
    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Remove sensitive information
    delete user.password;
    
    res.json({
      message: "Login successful",
      user: user
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, lname, fname } = req.body;

    if (!email || !password || !lname || !fname) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const [existingUsers] = await executeQuery(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await executeQuery(
      "INSERT INTO users (email, password, lname, fname) VALUES (?, ?, ?, ?)",
      [email, hashedPassword, lname, fname]
    );

    res.status(201).json({
      message: "User created successfully",
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};
