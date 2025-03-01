const axios = require("axios");
const Quiz = require("../models/Quiz");
const Result = require("../models/Result");


const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

exports.generateQuiz = async (req, res) => {
    try {
        const { links } = req.body;
        const userID = req.user.userId; // Extract userID from request

        if (!userID) {
            return res.status(401).json({ error: "Unauthorized: User ID missing." });
        }

        if (!links || !Array.isArray(links) || links.length === 0) {
            return res.status(400).json({ error: "Invalid links provided." });
        }

        // Generate the prompt for Gemini API
        const prompt = `Please read these artices one by one and generate a real exam level mcq questions with answers in indian competitive context. Return JSON response` +
            links.map((link, i) => `\nArticle ${i + 1}: ${link}`).join("");

        // Call Gemini API
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        }, { headers: { "Content-Type": "application/json" } });

        // Extract raw text response
        let quizText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Clean the response to remove unwanted characters
        quizText = quizText.trim()
            .replace(/^```json/, '') // Remove leading ```json
            .replace(/```$/, ''); // Remove trailing ```

        // Parse the response into JSON
        let quizData;
        try {
            quizData = JSON.parse(quizText);
        } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            return res.status(500).json({ error: "Failed to parse quiz data." });
        }

        // Save the quiz data to MongoDB with userID
        const newQuiz = new Quiz({
            userID: userID,
            quiz: quizData
        });

        await newQuiz.save();

        res.status(201).json({ message: "Quiz generated successfully.", quiz: newQuiz });
    } catch (error) {
        console.error("Error generating quiz:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.submitQuiz = async (req, res, next) => {
    try {
        const { quizID, answers } = req.body;
        const userID = req.user.userId; // Assuming user authentication middleware sets this

        // Fetch quiz from the database
        const quiz = await Quiz.findById(quizID);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Extract correct answers with error handling
        let correctAnswers;
        try {
            correctAnswers = quiz.quiz.map(q => q?.answer || null); // Handle undefined/null values
        } catch (err) {
            console.error("Error extracting correct answers:", err);
            return res.status(500).json({ message: "Error processing quiz answers" });
        }

        // Calculate score
        let score = 0;
        answers.forEach((ans, index) => {
            if (ans === correctAnswers[index]) {
                score++;
            }
        });

        // Total questions and percentage
        const totalQuestions = correctAnswers.length;
        const percentage = ((score / totalQuestions) * 100).toFixed(2) + "%";

        // Check if the user has already submitted this quiz
        let existingResult = await Result.findOne({ userID, quizID });

        if (existingResult) {
            // Update the existing result
            existingResult.score = score;
            existingResult.totalQuestions = totalQuestions;
            existingResult.percentage = percentage;
            existingResult.updatedAt = new Date();

            await existingResult.save();
            return res.json({
                message: "Quiz submission updated successfully",
                score,
                totalQuestions,
                percentage
            });
        } else {
            // Create a new result entry
            const newResult = new Result({
                userID,
                quizID,
                score,
                totalQuestions,
                percentage
            });

            await newResult.save();

            res.json({
                message: "Quiz submitted successfully",
                score,
                totalQuestions,
                percentage
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



exports.getQuiz = async (req, res) => {
    try {
        const userID = req.user.userId; // Extract userID from request

        if (!userID) {
            return res.status(401).json({ error: "Unauthorized: User ID missing." });
        }

        // Fetch quizzes for the authenticated user
        const quizzes = await Quiz.find({ userID });

        if (!quizzes.length) {
            return res.status(404).json({ message: "No quizzes found for this user." });
        }

        res.status(200).json({ quizzes });
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


exports.getResultByUserAndQuizID = async (req, res, next) => {
    try {
        const { quizID } = req.params; // Extract userID and quizID from URL params
        const userID = req.user.userId; // Assuming user authentication middleware sets this

        // Fetch the result from the database
        const result = await Result.findOne({ userID, quizID });

        if (!result) {
            return res.status(404).json({ message: "Result not found" });
        }

        res.json({
            message: "Result retrieved successfully",
            result
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};






