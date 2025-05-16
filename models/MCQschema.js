const mongoose = require('mongoose');

const mcqQuestionSchema = new mongoose.Schema({
  classification: {
    type: String,
    // required: true,
    trim: true,
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
        'Machine Learning',
        'other'
      ]
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(options) {
        return options.length === 4;
      },
      message: 'Exactly 4 options are required'
    }
  },
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function(answer) {
        return this.options.includes(answer);
      },
      message: 'Correct answer must be one of the provided options'
    }
  },
  level: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String
  }
});


const MCQQuestion = mongoose.model('MCQQuestion', mcqQuestionSchema, 'allmcqquestions');

module.exports = MCQQuestion;