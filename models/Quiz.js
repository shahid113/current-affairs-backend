const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: Object, required: true },
    attempt:{type:Boolean, default: false},
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);