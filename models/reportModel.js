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
        questions: questionsWithAnswers
      };
    } catch (error) {
      console.error('Error fetching assessment report:', error);
      throw error;
    }
  }
}

module.exports = new ReportModel();