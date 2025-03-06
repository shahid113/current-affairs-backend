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
        const prompt = `You are an expert examiner tasked with creating high-quality multiple-choice questions (MCQs) for Indian competitive exams (e.g., UPSC, SSC, Banking, or similar). Follow these steps:
        1. Read and analyze the following articles one by one, in the order provided.
        2. For each article, generate 2-3 important MCQs for upcoming exams.
        3. Each question should have 4 options, with only one correct answer. Include explanations for each option, especially the correct one.
        4. Ensure questions are framed in a professional, examiner-like tone, avoiding ambiguity or factual errors.
        5. Return the response in JSON format in this structure
         [ 
            {
                "question": "Question Text",
                 "options": {
                     "A": "Option A",
                     "B": "Option B",
                     "C": "Option C",
                     "D": "Option D"
                  },
                "answer": "A",
                "explanation": "Correct Explaination",
             },
                 
              {
                "question": "Question Text",
                 "options": {
                     "A": "Option A",
                     "B": "Option B",
                     "C": "Option C",
                     "D": "Option D"
                  },
                "answer": "B",
                "explanation": "Correct Explaination",
             }
             .....
            ],
           }.
          Articles to analyze:
        ${links.map((link, i) => `Article ${i + 1}: ${link}`).join("\n")}
        `;

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
        res.status(500).json({ error: error.message });
    }
};

exports.submitQuiz = async (req, res, next) => {
    try {
        const { quizID, attempt } = req.body;
        const userID = req.user.userId;

        // Validate request body
        if (!quizID || typeof attempt !== 'boolean') {
            return res.status(400).json({ message: "Quiz ID and attempt (true/false) are required" });
        }

        // Fetch quiz from the database
        const quiz = await Quiz.findById(quizID);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Check if the quiz belongs to the user (optional, depending on your requirements)
        if (quiz.userID.toString() !== userID) {
            return res.status(403).json({ message: "Unauthorized to submit this quiz" });
        }

        // Update the quiz attempt
        quiz.attempt = attempt;
        await quiz.save();

        // Return success response
        return res.status(200).json({
            message: "Quiz attempt submitted successfully",
            quiz: {
                quizID: quiz._id,
                attempt: quiz.attempt,
                updatedAt: new Date()
            }
        });

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
        const quizzes = await Quiz.find({ userID })
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






