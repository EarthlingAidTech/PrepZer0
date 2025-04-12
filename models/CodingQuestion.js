const mongoose = require('mongoose');

const CodingQuestionSchema = new mongoose.Schema({


    questionTile: { type: String, required: true },
    questiontext: { type: String, required: true },
    constraits: { type: String, required: true },
    inputFormat: { type: String, required: true },
    outputFormat: { type: String, required: true },
    sampleInput: { type: String, required: true },
    sampleOutput: { type: String, required: true },
    solutionTemplate: { type: String, required: true }, 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    marks: { type: Number, default: 0 }, 

    
});

module.exports = mongoose.model('CodingQuestion', CodingQuestionSchema);
