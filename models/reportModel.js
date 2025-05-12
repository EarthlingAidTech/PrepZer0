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

//       // Calculate integrity index
//       const integrityViolations = integrityData ? 
//         (integrityData.tabChanges + 
//          integrityData.mouseOuts + 
//          integrityData.fullscreenExits + 
//          integrityData.copyAttempts + 
//          integrityData.pasteAttempts + 
//          integrityData.focusChanges) : 0;
      
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
//           data: integrityData || {},
//           status: integrityStatus,
//           violations: integrityViolations
//         },
//         questions: questionsWithAnswers
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

      // Fetch integrity data
      const integrityData = await Integrity.findOne({
        examId: submission.exam._id,
        userId: submission.student._id
      }).exec();

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

      // Calculate integrity index
      const integrityViolations = integrityData ? 
        (integrityData.tabChanges + 
         integrityData.mouseOuts + 
         integrityData.fullscreenExits + 
         integrityData.copyAttempts + 
         integrityData.pasteAttempts + 
         integrityData.focusChanges) : 0;
      
      const integrityStatus = integrityViolations >= 3 ? 'Unacceptable' : 'Acceptable';

      // Format test duration
      const startTime = new Date(submission.exam.startTime);
      const endTime = new Date(submission.submittedAt);
      const durationMs = endTime - startTime;
      
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
      const formattedDuration = `${hours} hr ${minutes} min ${seconds} sec`;
      const allocatedTime = submission.exam.duration ? `${submission.exam.duration} min` : 'Not specified';
      const usedTime = `${formattedDuration} of ${allocatedTime} used`;

      // Fetch all submissions for this exam to calculate ranking
      const allSubmissions = await Submission.find({ exam: submission.exam._id })
        .populate('student')
        .exec();
      
      // Calculate scores for all submissions
      const submissionsWithScores = await Promise.all(allSubmissions.map(async (sub) => {
        // For each submission, calculate the total score
        const answers = sub.mcqAnswers || [];
        
        // Calculate total score for this submission
        let score = 0;
        for (const answer of answers) {
          const question = mcqQuestions.find(q => q._id.toString() === answer.questionId.toString());
          if (question && answer.selectedOption === question.correctAnswer) {
            score += question.marks;
          }
        }
        
        return {
          studentId: sub.student._id,
          studentName: `${sub.student.fname} ${sub.student.lname}`,
          score: score,
          submittedAt: sub.submittedAt
        };
      }));
      
      // Sort submissions by score (descending) and then by submission time (ascending)
      submissionsWithScores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score first
        }
        return new Date(a.submittedAt) - new Date(b.submittedAt); // Earlier submission first
      });
      
      // Find the rank of the current student
      const studentRank = submissionsWithScores.findIndex(s => 
        s.studentId.toString() === submission.student._id.toString()
      ) + 1; // Add 1 because array index is 0-based
      
      const totalStudents = submissionsWithScores.length;

      return {
        student: submission.student,
        exam: submission.exam,
        score: {
          obtained: totalScore,
          total: maxScore
        },
        timeAnalysis: {
          startTime,
          endTime,
          duration: usedTime
        },
        integrity: {
          data: integrityData || {},
          status: integrityStatus,
          violations: integrityViolations
        },
        questions: questionsWithAnswers,
        ranking: {
          rank: studentRank,
          totalStudents: totalStudents,
          topPerformers: submissionsWithScores.slice(0, 3) // Get top 5 students
        }
      };
    } catch (error) {
      console.error('Error fetching assessment report:', error);
      throw error;
    }
  }
}

module.exports = new ReportModel();