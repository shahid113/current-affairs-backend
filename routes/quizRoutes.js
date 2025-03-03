const express = require("express");
const { generateQuiz, getUserQuestions, getAllQuestions, submitQuiz, getQuiz, getResultByUserAndQuizID } = require("../controllers/quizController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/generate-quiz", authMiddleware, generateQuiz);
router.put("/submit-quiz", authMiddleware, submitQuiz);
router.get('/get-quiz', authMiddleware, getQuiz);
router.get("/result/:quizID", authMiddleware, getResultByUserAndQuizID);

module.exports = router;
