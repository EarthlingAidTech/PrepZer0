const mongoose = require("mongoose");

const MCQSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true }, // Links to Exam
    question: { type: String, required: true },
    options: [{ type: String, required: true }], // Array of options
    correctAnswer: { type: String, required: true }, // The correct option
    marks: { type: Number, default: 0 }, // Marks assigned to the question
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MCQ", MCQSchema);
