const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema({
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quizID: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Ensure user can submit a quiz only once (unique constraint)
ResultSchema.index({ userID: 1, quizID: 1 }, { unique: true });

module.exports = mongoose.model("Result", ResultSchema);
