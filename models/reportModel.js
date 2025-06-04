// const User = require('./usermodel');
// const Integrity = require('./Integrity');
// const Submission = require('./SubmissionSchema');
// const MCQ = require('./MCQQuestion');

// class ReportModel {
//   async getAssessmentReport(submissionId) {
//     try {
//       // Fetch submission with populated exam and student details
//       const submission = await Submission.findById(submissionId)
//         .populate('exam')
//         .populate('student')
//         .exec();

//       if (!submission) {
//         throw new Error('Submission not found');
//       }

//       // Fetch integrity data
//       const integrityData = await Integrity.findOne({
//         examId: submission.exam._id,
//         userId: submission.student._id
//       }).exec();

//       // Fetch all MCQ questions for this exam
//       const mcqQuestions = await MCQ.find({ examId: submission.exam._id }).exec();

//       // Map questions with answers
//       const questionsWithAnswers = mcqQuestions.map(question => {
//         const submittedAnswer = submission.mcqAnswers.find(
//           answer => answer.questionId.toString() === question._id.toString()
//         );
        
//         const isCorrect = submittedAnswer && submittedAnswer.selectedOption === question.correctAnswer;
        
//         return {
//           _id: question._id,
//           question: question.question,
//           options: question.options,
//           correctAnswer: question.correctAnswer,
//           submittedAnswer: submittedAnswer ? submittedAnswer.selectedOption : 'Not answered',
//           isCorrect: isCorrect,
//           marks: isCorrect ? question.marks : 0
//         };
//       });

//       // Calculate total score and maximum possible score
//       const totalScore = questionsWithAnswers.reduce((sum, q) => sum + (q.isCorrect ? q.marks : 0), 0);
//       const maxScore = mcqQuestions.reduce((sum, q) => sum + q.marks, 0);


//       // Calculate integrity index with proper data handling
//       let integrityViolations = 0;
//       let processedIntegrityData = null;

//       if (integrityData) {
//         integrityViolations = (integrityData.tabChanges || 0) + 
//                             (integrityData.mouseOuts || 0) + 
//                             (integrityData.fullscreenExits || 0) + 
//                             (integrityData.copyAttempts || 0) + 
//                             (integrityData.pasteAttempts || 0) + 
//                             (integrityData.focusChanges || 0);
        
//         // Return the actual data with proper structure
//         processedIntegrityData = {
//           tabChanges: integrityData.tabChanges || 0,
//           mouseOuts: integrityData.mouseOuts || 0,
//           fullscreenExits: integrityData.fullscreenExits || 0,
//           copyAttempts: integrityData.copyAttempts || 0,
//           pasteAttempts: integrityData.pasteAttempts || 0,
//           focusChanges: integrityData.focusChanges || 0,
//           screenConfiguration: integrityData.screenConfiguration || "Unknown",
//           lastEvent: integrityData.lastEvent || "N/A",
//           timestamps: integrityData.timestamps
//         };
//       } else {
//         // When no integrity data exists, return a proper structure
//         processedIntegrityData = {
//           tabChanges: 0,
//           mouseOuts: 0,
//           fullscreenExits: 0,
//           copyAttempts: 0,
//           pasteAttempts: 0,
//           focusChanges: 0,
//           screenConfiguration: "No data available",
//           lastEvent: "No monitoring data",
//           timestamps: null
//         };
//       }

//       const integrityStatus = integrityViolations >= 3 ? 'Unacceptable' : 'Acceptable';


//       // Format test duration
//       const startTime = new Date(submission.exam.startTime);
//       const endTime = new Date(submission.submittedAt);
//       const durationMs = endTime - startTime;
      
//       const hours = Math.floor(durationMs / (1000 * 60 * 60));
//       const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
//       const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
//       const formattedDuration = `${hours} hr ${minutes} min ${seconds} sec`;
//       const allocatedTime = submission.exam.duration ? `${submission.exam.duration} min` : 'Not specified';
//       const usedTime = `${formattedDuration} of ${allocatedTime} used`;

//       // Fetch all submissions for this exam to calculate ranking
//       const allSubmissions = await Submission.find({ exam: submission.exam._id })
//         .populate('student')
//         .exec();
      
//       // Calculate scores for all submissions
//       const submissionsWithScores = await Promise.all(allSubmissions.map(async (sub) => {
//         // For each submission, calculate the total score
//         const answers = sub.mcqAnswers || [];
        
//         // Calculate total score for this submission
//         let score = 0;
//         for (const answer of answers) {
//           const question = mcqQuestions.find(q => q._id.toString() === answer.questionId.toString());
//           if (question && answer.selectedOption === question.correctAnswer) {
//             score += question.marks;
//           }
//         }
        
//         return {
//           studentId: sub.student._id,
//           studentName: `${sub.student.fname}`,
//           score: score,
//           submittedAt: sub.submittedAt
//         };
//       }));
      
//       // Sort submissions by score (descending) and then by submission time (ascending)
//       submissionsWithScores.sort((a, b) => {
//         if (b.score !== a.score) {
//           return b.score - a.score; // Higher score first
//         }
//         return new Date(a.submittedAt) - new Date(b.submittedAt); // Earlier submission first
//       });
      
//       // Find the rank of the current student
//       const studentRank = submissionsWithScores.findIndex(s => 
//         s.studentId.toString() === submission.student._id.toString()
//       ) + 1; // Add 1 because array index is 0-based
      
//       const totalStudents = submissionsWithScores.length;

//       return {
//         student: submission.student,
//         exam: submission.exam,
//         score: {
//           obtained: totalScore,
//           total: maxScore
//         },
//         timeAnalysis: {
//           startTime,
//           endTime,
//           duration: usedTime
//         },
//         integrity: {
//           data: processedIntegrityData,
//           status: integrityStatus,
//           violations: integrityViolations
//         },
//         questions: questionsWithAnswers,
//         ranking: {
//           rank: studentRank,
//           totalStudents: totalStudents,
//           topPerformers: submissionsWithScores.slice(0, 3) // Get top 5 students
//         }
//       };
//     } catch (error) {
//       console.error('Error fetching assessment report:', error);
//       throw error;
//     }
//   }
// }

// module.exports = new ReportModel();





























const User = require('./usermodel');
const Integrity = require('./Integrity');
const Submission = require('./SubmissionSchema');
const MCQ = require('./MCQQuestion');
const EvaluationResult = require('./EvaluationResultSchema'); // Add this import

class ReportModel {
  async getAssessmentReport(submissionId) {
    try {
      // Fetch submission with populated exam and student details
      const submission = await Submission.findById(submissionId)
        .populate('exam')
        .populate('student')
        .exec();

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Determine question type
      const questionType = submission.exam.questionType || 'mcq';

      // Fetch integrity data
      const integrityData = await Integrity.findOne({
        examId: submission.exam._id,
        userId: submission.student._id
      }).exec();

      let reportData = {};

      // Handle different question types
      switch (questionType.toLowerCase()) {
        case 'mcq':
          reportData = await this.getMCQReport(submission, integrityData);
          break;
        case 'coding':
          reportData = await this.getCodingReport(submission, integrityData);
          break;
        case 'mcq&coding':
          reportData = await this.getMixedReport(submission, integrityData);
          break;
        default:
          throw new Error(`Unsupported question type: ${questionType}`);
      }

      return reportData;
    } catch (error) {
      console.error('Error fetching assessment report:', error);
      throw error;
    }
  }

  // Original MCQ report logic
  async getMCQReport(submission, integrityData) {
    // Fetch all MCQ questions for this exam
    const mcqQuestions = await MCQ.find({ examId: submission.exam._id }).exec();

    // Map questions with answers
    const questionsWithAnswers = mcqQuestions.map(question => {
      const submittedAnswer = submission.mcqAnswers.find(
        answer => answer.questionId.toString() === question._id.toString()
      );
      
      const isCorrect = submittedAnswer && submittedAnswer.selectedOption === question.correctAnswer;
      
      return {
        _id: question._id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        submittedAnswer: submittedAnswer ? submittedAnswer.selectedOption : 'Not answered',
        isCorrect: isCorrect,
        marks: isCorrect ? question.marks : 0
      };
    });

    // Calculate total score and maximum possible score
    const totalScore = questionsWithAnswers.reduce((sum, q) => sum + (q.isCorrect ? q.marks : 0), 0);
    const maxScore = mcqQuestions.reduce((sum, q) => sum + q.marks, 0);

    // Get ranking for MCQ
    const ranking = await this.getMCQRanking(submission.exam._id, submission.student._id, mcqQuestions);

    // Process integrity data
    const processedIntegrityData = this.processIntegrityData(integrityData);

    // Format time analysis
    const timeAnalysis = this.formatTimeAnalysis(submission);

    return {
      student: submission.student,
      exam: submission.exam,
      score: {
        obtained: totalScore,
        total: maxScore
      },
      timeAnalysis,
      integrity: processedIntegrityData,
      questions: questionsWithAnswers,
      ranking
    };
  }

  // New coding report logic
  async getCodingReport(submission, integrityData) {
    // Fetch evaluation result for this submission
    const evaluationResult = await EvaluationResult.findOne({
      examId: submission.exam._id,
      userId: submission.student._id
    }).exec();

    if (!evaluationResult) {
      throw new Error('Evaluation result not found for coding submission');
    }

    // Get ranking for coding
    const ranking = await this.getCodingRanking(submission.exam._id, submission.student._id);

    // Process integrity data
    const processedIntegrityData = this.processIntegrityData(integrityData);

    // Format time analysis
    const timeAnalysis = this.formatTimeAnalysis(submission);

    return {
      student: submission.student,
      exam: submission.exam,
      score: {
        obtained: evaluationResult.totalScore || 0,
        total: evaluationResult.maxPossibleScore || 0
      },
      timeAnalysis,
      integrity: processedIntegrityData,
      evaluationResult: evaluationResult,
      ranking
    };
  }

  // New mixed (MCQ & Coding) report logic
  async getMixedReport(submission, integrityData) {
    // Fetch MCQ questions
    // const mcqQuestions = await MCQ.find({ examId: submission.exam._id }).exec();

    const mcqQuestions = await MCQ.find({ 
      _id: { $in: submission.exam.mcqQuestions } 
    }).exec();

    // Fetch evaluation result for coding part
    const evaluationResult = await EvaluationResult.findOne({
      examId: submission.exam._id,
      userId: submission.student._id
    }).exec();

    // Process MCQ answers
    const questionsWithAnswers = mcqQuestions.map(question => {
      const submittedAnswer = submission.mcqAnswers.find(
        answer => answer.questionId.toString() === question._id.toString()
      );
      
      const isCorrect = submittedAnswer && submittedAnswer.selectedOption === question.correctAnswer;
      
      return {
        _id: question._id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        submittedAnswer: submittedAnswer ? submittedAnswer.selectedOption : 'Not answered',
        isCorrect: isCorrect,
        marks: isCorrect ? question.marks : 0
      };
    });

    // Calculate MCQ scores
    const mcqScore = questionsWithAnswers.reduce((sum, q) => sum + (q.isCorrect ? q.marks : 0), 0);
    const mcqMaxScore = mcqQuestions.reduce((sum, q) => sum + q.marks, 0);
   

    // Get coding scores
    const codingScore = evaluationResult ? evaluationResult.totalScore || 0 : 0;
    const codingMaxScore = evaluationResult ? evaluationResult.maxPossibleScore || 0 : 0;

    // Calculate total scores
    const totalScore = mcqScore + codingScore;
    const totalMaxScore = mcqMaxScore + codingMaxScore;
    



    // Get ranking for mixed type
    const ranking = await this.getMixedRanking(submission.exam._id, submission.student._id, mcqQuestions);

    // Process integrity data
    const processedIntegrityData = this.processIntegrityData(integrityData);

    // Format time analysis
    const timeAnalysis = this.formatTimeAnalysis(submission);

    return {
      student: submission.student,
      exam: submission.exam,
      score: {
        obtained: totalScore,
        total: totalMaxScore,
        mcq: {
          obtained: mcqScore,
          total: mcqMaxScore
        },
        coding: {
          obtained: codingScore,
          total: codingMaxScore
        }
      },
      timeAnalysis,
      integrity: processedIntegrityData,
      questions: questionsWithAnswers,
      evaluationResult: evaluationResult,
      ranking
    };
  }

  // MCQ ranking logic (original)
  async getMCQRanking(examId, studentId, mcqQuestions) {
    const allSubmissions = await Submission.find({ exam: examId })
      .populate('student')
      .exec();
    
    // Calculate scores for all submissions
    const submissionsWithScores = await Promise.all(allSubmissions.map(async (sub) => {
      const answers = sub.mcqAnswers || [];
      
      let score = 0;
      for (const answer of answers) {
        const question = mcqQuestions.find(q => q._id.toString() === answer.questionId.toString());
        if (question && answer.selectedOption === question.correctAnswer) {
          score += question.marks;
        }
      }
      
      return {
        studentId: sub.student._id,
        studentName: sub.student.fname,
        score: score,
        submittedAt: sub.submittedAt
      };
    }));
    
    // Sort by score (descending) and submission time (ascending - earlier submission gets better rank)
    submissionsWithScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score gets better rank
      }
      // If scores are equal, earlier submission time gets better rank
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });
    
    // Find rank if studentId is provided
    let studentRank = null;
    if (studentId) {
      studentRank = submissionsWithScores.findIndex(s => 
        s.studentId.toString() === studentId.toString()
      ) + 1;
    }
    
    return {
      rank: studentRank,
      totalStudents: submissionsWithScores.length,
      topPerformers: submissionsWithScores.slice(0, 3),
      allStudentsRanking: submissionsWithScores // Add this for controller use
    };
  }

  // Coding ranking logic
  async getCodingRanking(examId, studentId) {
    const allEvaluationResults = await EvaluationResult.find({ examId: examId })
      .populate('userId')
      .exec();
    
    // Calculate scores for all evaluation results
    const resultsWithScores = allEvaluationResults.map(result => ({
      studentId: result.userId._id,
      studentName: result.userId.fname || result.studentName,
      score: result.totalScore || 0,
      submittedAt: result.submittedAt || result.evaluatedAt
    }));
    
    // Sort by score (descending) and submission time (ascending - earlier submission gets better rank)
    resultsWithScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score gets better rank
      }
      // If scores are equal, earlier submission time gets better rank
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });
    
    // Find rank if studentId is provided
    let studentRank = null;
    if (studentId) {
      studentRank = resultsWithScores.findIndex(r => 
        r.studentId.toString() === studentId.toString()
      ) + 1;
    }
    
    return {
      rank: studentRank,
      totalStudents: resultsWithScores.length,
      topPerformers: resultsWithScores.slice(0, 3),
      allStudentsRanking: resultsWithScores // Add this for controller use
    };
  }

  // Mixed (MCQ & Coding) ranking logic
  async getMixedRanking(examId, studentId, mcqQuestions) {
    // Get all submissions
    const allSubmissions = await Submission.find({ exam: examId })
      .populate('student')
      .exec();

    // Get all evaluation results
    const allEvaluationResults = await EvaluationResult.find({ examId: examId })
      .populate('userId')
      .exec();

    // Create maps for quick lookup
    const evaluationResultsMap = new Map();
    allEvaluationResults.forEach(result => {
      evaluationResultsMap.set(result.userId._id.toString(), result);
    });
    
    // Calculate combined scores for all submissions
    const submissionsWithScores = await Promise.all(allSubmissions.map(async (sub) => {
      // Calculate MCQ score
      const answers = sub.mcqAnswers || [];
      let mcqScore = 0;
      for (const answer of answers) {
        const question = mcqQuestions.find(q => q._id.toString() === answer.questionId.toString());
        if (question && answer.selectedOption === question.correctAnswer) {
          mcqScore += question.marks;
        }
      }

      // Get coding score
      const evaluationResult = evaluationResultsMap.get(sub.student._id.toString());
      const codingScore = evaluationResult ? evaluationResult.totalScore || 0 : 0;

      // Calculate total score
      const totalScore = mcqScore + codingScore;
      
      return {
        studentId: sub.student._id,
        studentName: sub.student.fname,
        score: totalScore,
        mcqScore: mcqScore,
        codingScore: codingScore,
        submittedAt: sub.submittedAt
      };
    }));
    
    // Sort by total score (descending) and submission time (ascending - earlier submission gets better rank)
    submissionsWithScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher total score gets better rank
      }
      // If total scores are equal, earlier submission time gets better rank
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });
    
    // Find rank if studentId is provided
    let studentRank = null;
    if (studentId) {
      studentRank = submissionsWithScores.findIndex(s => 
        s.studentId.toString() === studentId.toString()
      ) + 1;
    }
    
    return {
      rank: studentRank,
      totalStudents: submissionsWithScores.length,
      topPerformers: submissionsWithScores.slice(0, 3),
      allStudentsRanking: submissionsWithScores // Add this for controller use
    };
  }

  // Helper method to process integrity data
  processIntegrityData(integrityData) {
    let integrityViolations = 0;
    let processedIntegrityData = null;

    if (integrityData) {
      integrityViolations = (integrityData.tabChanges || 0) + 
                          (integrityData.mouseOuts || 0) + 
                          (integrityData.fullscreenExits || 0) + 
                          (integrityData.copyAttempts || 0) + 
                          (integrityData.pasteAttempts || 0) + 
                          (integrityData.focusChanges || 0);
      
      processedIntegrityData = {
        tabChanges: integrityData.tabChanges || 0,
        mouseOuts: integrityData.mouseOuts || 0,
        fullscreenExits: integrityData.fullscreenExits || 0,
        copyAttempts: integrityData.copyAttempts || 0,
        pasteAttempts: integrityData.pasteAttempts || 0,
        focusChanges: integrityData.focusChanges || 0,
        screenConfiguration: integrityData.screenConfiguration || "Unknown",
        lastEvent: integrityData.lastEvent || "N/A",
        timestamps: integrityData.timestamps
      };
    } else {
      processedIntegrityData = {
        tabChanges: 0,
        mouseOuts: 0,
        fullscreenExits: 0,
        copyAttempts: 0,
        pasteAttempts: 0,
        focusChanges: 0,
        screenConfiguration: "No data available",
        lastEvent: "No monitoring data",
        timestamps: null
      };
    }

    const integrityStatus = integrityViolations >= 3 ? 'Unacceptable' : 'Acceptable';

    return {
      data: processedIntegrityData,
      status: integrityStatus,
      violations: integrityViolations
    };
  }

  // Helper method to format time analysis
  formatTimeAnalysis(submission) {
    const startTime = new Date(submission.exam.startTime);
    const endTime = new Date(submission.submittedAt);
    const durationMs = endTime - startTime;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    const formattedDuration = `${hours} hr ${minutes} min ${seconds} sec`;
    const allocatedTime = submission.exam.duration ? `${submission.exam.duration} min` : 'Not specified';
    const usedTime = `${formattedDuration} of ${allocatedTime} used`;

    return {
      startTime,
      endTime,
      duration: usedTime
    };
  }
}

module.exports = new ReportModel();