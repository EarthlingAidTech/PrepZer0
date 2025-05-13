

const { sample } = require('lodash');
const mongoose = require('mongoose');

// Test case schema
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

// Main coding question schema
const codingQuestionSchema = new mongoose.Schema({
  questionTile: {
    type: String,
    required: true,
    
    trim: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questiontext: {
    type: String,
    
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
  sampleInput: {
    type: String,
    trim: true
  },
  sampleOutput: {
    type: String,
    trim: true
  },
  solutionTemplate: { type: String, required: true }, 
  classification: {
    type: String,
    required: true,
    enum: [
      'Arrays', 'Strings', 'Linked Lists', 'Stacks', 'Queues',
      'Trees', 'Graphs', 'Recursion', 'Dynamic Programming',
      'Sorting', 'Searching', 'Hashing', 'Greedy Algorithms',
      'Backtracking', 'Math', 'Bit Manipulation', 'Matrix'
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

});

// Indexes

codingQuestionSchema.index({ level: 1 });
codingQuestionSchema.index({ classification: 1 });

const DbCodingQuestion = mongoose.model('DbCodingQuestion', codingQuestionSchema);

module.exports = DbCodingQuestion;
