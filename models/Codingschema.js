// const mongoose = require('mongoose');

// const testCaseSchema = new mongoose.Schema({
//   input: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   expectedOutput: {
//     type: String,
//     required: true,
//     trim: true
//   }
// });

// // const starterCodeSchema = new mongoose.Schema({
// //   language: {
// //     type: String,
// //     required: true,
// //     trim: true
// //   },
// //   code: {
// //     type: String,
// //     required: true
// //   }
// // });

// const codingQuestionSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true,
//     unique: true
//   },
//   description: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   constraintDescription: {
//     type: String,
//     trim: true
//   },
//   inputFormat: {
//     type: String,
//     trim: true
//   },
//   outputFormat: {
//     type: String,
//     trim: true
//   },
//   classification: {
//     type: String,
//     required: true,
//     enum: [
//       'Arrays',
//       'Strings',
//       'Linked Lists',
//       'Stacks',
//       'Queues',
//       'Trees',
//       'Graphs',
//       'Recursion',
//       'Dynamic Programming',
//       'Sorting',
//       'Searching',
//       'Hashing',
//       'Greedy Algorithms',
//       'Backtracking',
//     ]
//   },
//   level: {
//     type: String,
//     required: true,
//     enum: ['easy', 'medium', 'hard'],
//     default: 'easy'
//   },
//   maxMarks: {
//     type: Number,
//     required: true,
//     min: 1
//   },
//   testCases: {
//     type: [testCaseSchema],
//     required: true,
//     validate: {
//       validator: function(testCases) {
//         return testCases.length > 0;
//       },
//       message: 'At least one test case is required'
//     }
//   },
//   // starterCode: {
//   //   type: [starterCodeSchema],
//   //   default: []
//   // },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
// });


// // Create indexes for common queries
// codingQuestionSchema.index({ title: 1 }, { unique: true });
// codingQuestionSchema.index({ level: 1 });
// codingQuestionSchema.index({ classification: 1 });
// codingQuestionSchema.index({ "classification": 1, "level": 1 });
// codingQuestionSchema.index({ maxMarks: 1 });

// const CodingQuestion = mongoose.model('CodingQuestion', codingQuestionSchema, 'allcodingquestions');

// module.exports = CodingQuestion;

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
  title: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
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
  constraintDescription: {
    type: String,
    trim: true
  },
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
  }
});

// Indexes
codingQuestionSchema.index({ title: 1 }, { unique: true });
codingQuestionSchema.index({ level: 1 });
codingQuestionSchema.index({ classification: 1 });

const CodingQuestion = mongoose.model('CodingQuestion', codingQuestionSchema);

module.exports = CodingQuestion;
