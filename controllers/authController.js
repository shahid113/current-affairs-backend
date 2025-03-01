const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
    try {
        // Validate input data
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const newUser = await User.create({ name, email, password: hashedPassword });

        // Generate JWT token
        const accessToken = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });

        // Exclude password from response
        const userResponse = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt
        };

        res.status(201).json({ 
            message: "User registered successfully", 
            user: userResponse,
            token: accessToken
        });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: "Server error. Please try again later." });
    }
};
exports.login = async (req, res) => {
    try {
        // Validate input data
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });

        // Exclude password from response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
        };

        res.json({ 
            message: "Login successful", 
            user: userResponse,
            token: accessToken 
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Server error. Please try again later." });
    }
};
