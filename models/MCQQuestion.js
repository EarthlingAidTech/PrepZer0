const mongoose = require("mongoose");

const MCQSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true }, // Links to Exam
    classification: { type: String, required: true, trim: true,
        enum: [
            'Data Structures',
            'Algorithms',
            'Databases',
            'Object-Oriented Programming',
            'Networking',
            'Operating Systems',
            'Software Engineering',
            'Mathematics',
            'Artificial Intelligence',
            'Machine Learning'
          ]
      },
    question: { type: String, required: true },
    options: [{ type: String, required: true }], // Array of options
    correctAnswer: { type: String, required: true }, // The correct option
    level: {type: String, required: true, enum: ['easy', 'medium', 'hard'], default: 'easy'},
    marks: { type: Number, default: 0 }, // Marks assigned to the question
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }


});

module.exports = mongoose.model("MCQ", MCQSchema);
