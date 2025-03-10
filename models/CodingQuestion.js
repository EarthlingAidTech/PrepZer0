const mongoose = require('mongoose');

const CodingQuestionSchema = new mongoose.Schema({
    questionTitle: { type: String, required: true }, 
    questionText: { type: String, required: true }, 
    constraints: { type: String, required: true }, 
    inputFormat: { type: String, required: true }, 
    outputFormat: { type: String, required: true }, 
    sampleInput: { type: String, required: true }, 
    sampleOutput: { type: String, required: true }, 
    solutionTemplate: { type: String, required: true }, 
    marks: { type: Number, default: 0 }, 
    isPredefined: { type: Boolean, default: false }, 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    createdAt: { type: Date, default: Date.now } 
});

module.exports = mongoose.model('CodingQuestion', CodingQuestionSchema);
