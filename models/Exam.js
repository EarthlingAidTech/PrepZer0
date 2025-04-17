// const mongoose = require("mongoose");

// const ExamSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     departments: [{ type: String, enum: ["mc", "is", "cs", "et", "ec", "ai", "cv"], required: true }],
//     semester: { type: Number, min: 1, max: 8, required: true },
//     questionType: { type: String, enum: ["mcq", "coding", "mcq&coding"], required: true },
//     numTotalQuestions: { type: Number, default: 0 },
//     numMCQs: { type: Number, default: 0 },
//     numCoding: { type: Number, default: 0 },
//     mcqQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "MCQ" }],
//     codingQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "CodingQuestion" }],
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     scheduledAt: { type: Date },
//     scheduleTill: { type: Date },
//     duration: { type: Number },
//     integrityCheck: { type: Boolean, default: false },
//     createdAt: { type: Date, default: Date.now },
//     testStatus: {type: String, enum:["draft", "ongoing", "completed"], default:"ongoing"}
// });

// // Validation before saving the exam
// ExamSchema.pre("save", function (next) {
//     if (this.questionType === "mcq" && this.numMCQs <= 0) {
//         return next(new Error("MCQ exams must have at least one MCQ question."));
//     }
//     if (this.questionType === "coding" && this.numCoding <= 0) {
//         return next(new Error("Coding exams must have at least one coding question."));
//     }
//     if (this.questionType === "mcq&coding") {
//         if (this.numTotalQuestions !== this.numMCQs + this.numCoding) {
//             return next(new Error("Total questions must equal MCQs + Coding questions."));
//         }
//     }
//     next();
// });

// module.exports = mongoose.model("Exam", ExamSchema);

// models/Exam.js
const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    departments: [{ type: String, enum: ["mc", "is", "cs", "et", "ec", "ai", "cv"], required: true }],
    semester: { type: Number, min: 1, max: 8, required: true },
    questionType: { type: String, enum: ["mcq", "coding", "mcq&coding"], required: true },
    numTotalQuestions: { type: Number, default: 0 },
    numMCQs: { type: Number, default: 0 },
    numCoding: { type: Number, default: 0 },
    mcqQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "MCQ" }],
    codingQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "CodingQuestion" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    scheduledAt: { type: Date },
    scheduleTill: { type: Date },
    duration: { type: Number },
    integrityCheck: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    testStatus: { type: String, enum: ["draft", "ongoing", "completed"], default: "ongoing" }
});

// Validation before saving the exam
ExamSchema.pre("save", function (next) {
    // Set status to "draft" if either scheduledAt or scheduleTill is missing
    if (!this.scheduledAt || !this.scheduleTill) {
        this.testStatus = "draft";
    }

    // Question type validation
    if (this.questionType === "mcq" && this.numMCQs <= 0) {
        return next(new Error("MCQ exams must have at least one MCQ question."));
    }
    if (this.questionType === "coding" && this.numCoding <= 0) {
        return next(new Error("Coding exams must have at least one coding question."));
    }
    if (this.questionType === "mcq&coding") {
        if (this.numTotalQuestions !== this.numMCQs + this.numCoding) {
            return next(new Error("Total questions must equal MCQs + Coding questions."));
        }
    }
    next();
});

module.exports = mongoose.model("Exam", ExamSchema);