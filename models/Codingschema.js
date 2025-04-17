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
  explanation: {
    type: String,
    trim: true
  },
  isSample: {
    type: Boolean,
    default: false
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  },
  timeoutMs: {
    type: Number,
    default: 2000
  }
});

const starterCodeSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  }
});

const codingQuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  constraintDescription: {
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
  classification: {
    type: [String],
    required: true,
    validate: {
      validator: function(classifications) {
        return classifications.length > 0;
      },
      message: 'At least one classification is required'
    },
    enum: [
      'Arrays',
      'Strings',
      'Linked Lists',
      'Stacks',
      'Queues',
      'Trees',
      'Graphs',
      'Recursion',
      'Dynamic Programming',
      'Sorting',
      'Searching',
      'Hashing',
      'Greedy Algorithms',
      'Backtracking',
      'Bit Manipulation',
      'Mathematics'
    ]
  },
  level: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  timeLimit: {
    type: Number,
    default: 2000 // 2 seconds in milliseconds
  },
  memoryLimit: {
    type: Number,
    default: 262144 // 256MB in KB
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
      validator: function(testCases) {
        return testCases.length > 0;
      },
      message: 'At least one test case is required'
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


// Create indexes for common queries
codingQuestionSchema.index({ title: 1 }, { unique: true });
codingQuestionSchema.index({ level: 1 });
codingQuestionSchema.index({ classification: 1 });
codingQuestionSchema.index({ "classification": 1, "level": 1 });
codingQuestionSchema.index({ maxMarks: 1 });

const CodingQuestion = mongoose.model('CodingQuestion', codingQuestionSchema);

module.exports = CodingQuestion;