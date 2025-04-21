const mongoose = require('mongoose');



const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true,
    trim: true
  },
  expectedOutput: {
    type: String,
    required: true,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  timeout: {
    type: Number,
    default: 2 // seconds
  },
  memoryLimit: {
    type: Number,
    default: 256 // MB
  }
});

// Starter code schema
const starterCodeSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  }
});

const CodingQuestionSchema = new mongoose.Schema({
  
    solutionTemplate: { type: String, required: true }, 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    marks: { type: Number, default: 0 }, 

    questionTile: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },
      questiontext: {
        type: String,
        required: true,
        trim: true
      },
      inputFormat: {
        type: String,
        trim: true
      },
      outputFormat: {
        type: String,
        trim: true
      },
      constraits: {
        type: String,
        trim: true
      },
      classification: {
        type: String,
       
        enum: [
          'Arrays', 'Strings', 'Linked Lists', 'Stacks', 'Queues',
          'Trees', 'Graphs', 'Recursion', 'Dynamic Programming',
          'Sorting', 'Searching', 'Hashing', 'Greedy Algorithms',
          'Backtracking', 'Math', 'Bit Manipulation', 'Matrix' ,'SQL'
        ]
      },
      level: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
      },
      maxMarks: {
        type: Number,
        required: true,
        min: 1
      },
      testCases: {
        type: [testCaseSchema],
        required: true,
        validate: {
          validator: function (testCases) {
            return testCases.length > 0;
          },
          message: 'At least one test case is required.'
        }
      },
      starterCode: {
        type: [starterCodeSchema],
        default: []
      }
    
});
CodingQuestionSchema.index({ title: 1 }, { unique: true });
CodingQuestionSchema.index({ level: 1 });
CodingQuestionSchema.index({ classification: 1 });
module.exports = mongoose.model('CodingQuestion', CodingQuestionSchema);
