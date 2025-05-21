const mongoose = require('mongoose');

// Define the schema for test case results
const testCaseResultSchema = new mongoose.Schema({
  input: { type: String },
  expectedOutput: { type: String },
  actualOutput: { type: String },
  passed: { type: Boolean, default: false },
  error: { type: String },
  executionTime: { type: Number },
  memoryUsage: { type: Number }
});

// Define the schema for execution details
const executionDetailsSchema = new mongoose.Schema({
  status: { 
    type: String, 
    enum: ['pending', 'executed', 'compilation_error', 'runtime_error', 'execution_error', 'error', 'not_executed'],
    default: 'pending'
  },
  compilationError: { type: String },
  runtimeError: { type: String },
  executionTime: { type: Number, default: 0 },
  memoryUsage: { type: Number, default: 0 }
});

// Define the schema for question results
const questionResultSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingQuestion', required: true },
  title: { type: String },
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['correct', 'partial', 'incorrect', 'not_attempted'],
    default: 'not_attempted'
  },
  testCasesTotal: { type: Number, default: 0 },
  testCasesPassed: { type: Number, default: 0 },
  executionDetails: { type: executionDetailsSchema },
  testCases: { type: [testCaseResultSchema] },
  failedTestCases: { type: [testCaseResultSchema] },
  errorSummary: { type: String }
});

// Define the schema for summary statistics
const summarySchema = new mongoose.Schema({
  totalQuestions: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  partial: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 },
  passedTestCases: { type: Number, default: 0 }
});

// Define the main evaluation result schema
const evaluationResultSchema = new mongoose.Schema({
  examId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Exam', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  studentName: { type: String },
  usn: { type: String },
  totalScore: { type: Number, default: 0 },
  maxPossibleScore: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  submittedAt: { type: Date },
  evaluatedAt: { type: Date, default: Date.now },
  questions: { type: [questionResultSchema] },
  summary: { type: summarySchema },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add compound index for efficient querying
evaluationResultSchema.index({ examId: 1, userId: 1 }, { unique: true });

// Add additional indexes for common query patterns
evaluationResultSchema.index({ examId: 1, 'summary.correct': -1 }); // For leaderboards
evaluationResultSchema.index({ userId: 1, evaluatedAt: -1 }); // For user history
evaluationResultSchema.index({ examId: 1, totalScore: -1 }); // For ranking

module.exports = mongoose.model('EvaluationResult', evaluationResultSchema);