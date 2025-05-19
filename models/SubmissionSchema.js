const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mcqAnswers: [{ questionId: mongoose.Schema.Types.ObjectId, selectedOption: String }],
    codingAnswers: [{ questionId: mongoose.Schema.Types.ObjectId, code: String , language : Number }],
    score: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Submission", SubmissionSchema);
