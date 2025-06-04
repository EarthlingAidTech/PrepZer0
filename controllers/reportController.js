const reportModel = require('../models/reportModel');
const Submission = require("./../models/SubmissionSchema");
const Integrity = require("./../models/Integrity");
const mongoose = require('mongoose');
const EvaluationResult = require('../models/EvaluationResultSchema');
const ActivityTracker = require('./../models/ActiveSession');


// exports.viewAssessmentReport = async(req,res) => {
//   try {
//       const submissionId = req.params.submissionId;
      
//       if (!submissionId) {
//         return res.status(400).send('Submission ID is required');
//       }
      
//       // Fetch the base report with MCQ data
//       const reportData = await reportModel.getAssessmentReport(submissionId);
      
//       // Get the submission to access student and exam IDs
//       const submission = await Submission.findById(submissionId)
//         .populate('exam')
//         .populate('student');
      
//       if (!submission) {
//         throw new Error('Submission not found');
//       }
      
//       // Fetch start time from ActivityTracker using examId and userId
//       const activityTracker = await ActivityTracker.findOne({
//         examId: submission.exam._id,
//         userId: submission.student._id
//       }).select('startedAt').lean();

//       reportData.startTime = activityTracker ? activityTracker.startedAt : null;


//        // Get end time from submission
//       reportData.endTime = submission.submittedAt || null;
      
//       // Calculate duration and create timeAnalysis object
//       reportData.timeAnalysis = {
//         startTime: reportData.startTime,
//         endTime: reportData.endTime,
//         duration: 'Not Available',
//         durationInMinutes: 0,
//         durationInSeconds: 0
//       };
      
//       if (reportData.startTime && reportData.endTime) {
//         const startTime = new Date(reportData.startTime);
//         const endTime = new Date(reportData.endTime);
//         const durationMs = endTime - startTime;
        
//         if (durationMs > 0) {
//           const durationInSeconds = Math.floor(durationMs / 1000);
//           const durationInMinutes = Math.floor(durationInSeconds / 60);
//           const hours = Math.floor(durationInMinutes / 60);
//           const minutes = durationInMinutes % 60;
//           const seconds = durationInSeconds % 60;
          
//           // Format duration
//           let formattedDuration = '';
//           if (hours > 0) {
//             formattedDuration = `${hours}h ${minutes}m`;
//           } else if (minutes > 0) {
//             formattedDuration = `${minutes}m ${seconds}s`;
//           } else {
//             formattedDuration = `${seconds}s`;
//           }
          
//           reportData.timeAnalysis = {
//             startTime: reportData.startTime,
//             endTime: reportData.endTime,
//             duration: formattedDuration,
//             durationInMinutes: durationInMinutes,
//             durationInSeconds: durationInSeconds,
//             durationMs: durationMs
//           };
//         }
//       }




//       // Check if this is a coding exam or has coding questions
//       const hasCoding = submission.exam.questionType === 'coding' || 
//                        submission.exam.questionType === 'mcq&coding';
      
//       // If it has coding questions, fetch coding evaluation results
//       if (hasCoding) {
//         // Find the coding evaluation result for this student and exam
//         const codingEvaluation = await EvaluationResult.findOne({
//           userId: submission.student._id,
//           examId: submission.exam._id
//         }).lean();
        
//         // Add coding evaluation data to the report
//         if (codingEvaluation) {
//           reportData.codingEvaluation = codingEvaluation;

          
//           // Add a combined score (MCQ + Coding)
//           const mcqScore = reportData.score.obtained || 0;
//           const mcqTotal = reportData.score.total || 0;
          
          
//           const codingScore = codingEvaluation.totalScore || 
//                              (codingEvaluation.results && codingEvaluation.results.totalScore) || 0;

//           const codingTotal = codingEvaluation.maxPossibleScore;
          
//           reportData.combinedScore = {
//             obtained: mcqScore + codingScore,
//             total: mcqTotal + codingTotal,
//             mcq: {
//               obtained: mcqScore,
//               total: mcqTotal
//             },
//             coding: {
//               obtained: codingScore,
//               total: codingTotal,
//               evaluationStatus: 'Evaluated',
//               details: codingEvaluation.results || {},
//               percentage: codingEvaluation.percentage || 
//                          (codingEvaluation.results && codingEvaluation.results.percentage) || 0
//             }
//           };
//         } else {
//           // No coding evaluation results found - exam has coding questions but not evaluated yet
//           reportData.codingEvaluation = null;
//           reportData.combinedScore = {
//             obtained: reportData.score.obtained || 0,
//             total: reportData.score.total || 0,
//             mcq: {
//               obtained: reportData.score.obtained || 0,
//               total: reportData.score.total || 0
//             },
//             coding: {
//               obtained: 0,
//               total: 100,
//               evaluationStatus: 'Pending Evaluation',
//               details: null
//             }
//           };
//         }
//       } else {
//         // Exam doesn't have coding questions, just use MCQ score
//         reportData.combinedScore = {
//           obtained: reportData.score.obtained || 0,
//           total: reportData.score.total || 0,
//           mcq: {
//             obtained: reportData.score.obtained || 0,
//             total: reportData.score.total || 0
//           }
//         };
//       }
      
//       console.log("Complete Report Data:", {
//         hasCoding: hasCoding,
//         combinedScore: reportData.combinedScore,
//         codingEvaluation: reportData.codingEvaluation ? 'Present' : 'Not found'
//       });
      
//       // Render the EJS template with the complete report data
//       res.render('assessment_report', { 
//         title: 'PrepZer0 Assessment Report',
//         report: reportData,
//         submissionId: submissionId,
//         hasCoding: hasCoding
//       });
//     } catch (error) {
//       console.error('Error in assessment report controller:', error);
//       res.status(500).render('error', { 
//         message: 'Failed to load assessment report',
//         error: process.env.NODE_ENV === 'development' ? error : {}
//       });
//     }
// }















// exports.viewAssessmentReport = async(req,res) => {
//   try {
//       const submissionId = req.params.submissionId;
      
//       if (!submissionId) {
//         return res.status(400).send('Submission ID is required');
//       }
      
//       // Fetch the base report with MCQ data using the ReportModel
//       const reportData = await reportModel.getAssessmentReport(submissionId);
      
//       // Get the submission to access student and exam IDs
//       const submission = await Submission.findById(submissionId)
//         .populate('exam')
//         .populate('student');
      
//       if (!submission) {
//         throw new Error('Submission not found');
//       }
      
//       // Fetch start time from ActivityTracker using examId and userId
//       const activityTracker = await ActivityTracker.findOne({
//         examId: submission.exam._id,
//         userId: submission.student._id
//       }).select('startedAt').lean();

//       // Update time analysis with ActivityTracker data if available
//       if (activityTracker && activityTracker.startedAt) {
//         const startTime = new Date(activityTracker.startedAt);
//         const endTime = new Date(submission.submittedAt);
//         const durationMs = endTime - startTime;
        
//         if (durationMs > 0) {
//           const durationInSeconds = Math.floor(durationMs / 1000);
//           const durationInMinutes = Math.floor(durationInSeconds / 60);
//           const hours = Math.floor(durationInMinutes / 60);
//           const minutes = durationInMinutes % 60;
//           const seconds = durationInSeconds % 60;
          
//           // Format duration
//           let formattedDuration = '';
//           if (hours > 0) {
//             formattedDuration = `${hours}h ${minutes}m ${seconds}s`;
//           } else if (minutes > 0) {
//             formattedDuration = `${minutes}m ${seconds}s`;
//           } else {
//             formattedDuration = `${seconds}s`;
//           }
          
//           // Override the timeAnalysis from ReportModel with more accurate data
//           reportData.timeAnalysis = {
//             startTime: startTime,
//             endTime: endTime,
//             duration: formattedDuration,
//             durationInMinutes: durationInMinutes,
//             durationInSeconds: durationInSeconds,
//             durationMs: durationMs
//           };
//         }
//       }

//       // Determine question type - normalize the format
//       let questionType = submission.exam.questionType || 'mcq';
//       questionType = questionType.toLowerCase().replace(/\s+/g, ' '); // normalize spaces
      
//       // Check if this is a coding exam or has coding questions
//       const hasCoding = questionType === 'coding' || 
//                        questionType === 'mcq & coding' ||
//                        questionType === 'mcq&coding';
      
//       console.log('Question Type:', questionType);
//       console.log('Has Coding:', hasCoding);
//       console.log('Report Data Structure:', {
//         hasQuestions: !!reportData.questions,
//         hasEvaluationResult: !!reportData.evaluationResult,
//         scoreStructure: reportData.score
//       });
      
//       // The ReportModel already handles different question types and provides the correct structure
//       // We don't need to override it unless we have additional data to add
      
//       // If it's a mixed assessment and we have both MCQ and coding data
//       if (questionType === 'mcq & coding' && reportData.score.mcq && reportData.score.coding) {
//         // ReportModel already provides the correct structure for mixed assessments
//         reportData.combinedScore = {
//           obtained: reportData.score.obtained,
//           total: reportData.score.total,
//           mcq: reportData.score.mcq,
//           coding: reportData.score.coding
//         };
//       }
      
//       // Log final report structure for debugging
//       console.log("Final Report Data Structure:", {
//         questionType: questionType,
//         hasCoding: hasCoding,
//         hasQuestions: !!reportData.questions,
//         hasEvaluationResult: !!reportData.evaluationResult,
//         scoreStructure: {
//           main: reportData.score,
//           combined: reportData.combinedScore || 'Not set'
//         }
//       });
      
//       // Render the EJS template with the complete report data
//       res.render('assessment_report', { 
//         title: 'PrepZer0 Assessment Report',
//         report: reportData,
//         submissionId: submissionId,
//         hasCoding: hasCoding,
//         questionType: questionType
//       });
//     } catch (error) {
//       console.error('Error in assessment report controller:', error);
//       console.error('Error stack:', error.stack);
//       res.status(500).render('error', { 
//         message: 'Failed to load assessment report',
//         error: process.env.NODE_ENV === 'development' ? error : {}
//       });
//     }
// }




















exports.viewAssessmentReport = async(req,res) => {
  try {
      const submissionId = req.params.submissionId;
      
      if (!submissionId) {
        return res.status(400).send('Submission ID is required');
      }
      
      // Fetch the base report with MCQ data
      const reportData = await reportModel.getAssessmentReport(submissionId);
      
      // Get the submission to access student and exam IDs
      const submission = await Submission.findById(submissionId)
        .populate('exam')
        .populate('student');
      
      if (!submission) {
        throw new Error('Submission not found');
      }
      
      // Fetch start time from ActivityTracker using examId and userId
      const activityTracker = await ActivityTracker.findOne({
        examId: submission.exam._id,
        userId: submission.student._id
      }).select('startedAt').lean();

      reportData.startTime = activityTracker ? activityTracker.startedAt : null;
      reportData.endTime = submission.submittedAt || null;
      
      // Calculate duration and create timeAnalysis object
      reportData.timeAnalysis = {
        startTime: reportData.startTime,
        endTime: reportData.endTime,
        duration: 'Not Available',
        durationInMinutes: 0,
        durationInSeconds: 0
      };
      
      if (reportData.startTime && reportData.endTime) {
        const startTime = new Date(reportData.startTime);
        const endTime = new Date(reportData.endTime);
        const durationMs = endTime - startTime;
        
        if (durationMs > 0) {
          const durationInSeconds = Math.floor(durationMs / 1000);
          const durationInMinutes = Math.floor(durationInSeconds / 60);
          const hours = Math.floor(durationInMinutes / 60);
          const minutes = durationInMinutes % 60;
          const seconds = durationInSeconds % 60;
          
          let formattedDuration = '';
          if (hours > 0) {
            formattedDuration = `${hours}h ${minutes}m`;
          } else if (minutes > 0) {
            formattedDuration = `${minutes}m ${seconds}s`;
          } else {
            formattedDuration = `${seconds}s`;
          }
          
          reportData.timeAnalysis = {
            startTime: reportData.startTime,
            endTime: reportData.endTime,
            duration: formattedDuration,
            durationInMinutes: durationInMinutes,
            durationInSeconds: durationInSeconds,
            durationMs: durationMs
          };
        }
      }

      // Ensure questions array exists for template compatibility
      if (!reportData.questions) {
        reportData.questions = [];
      }

      // Determine question type
      const questionType = submission.exam.questionType.toLowerCase();
      const hasCoding = questionType === 'coding' || questionType === 'mcq&coding' || questionType === 'mcq & coding';
      const hasMCQ = questionType === 'mcq' || questionType === 'mcq&coding' || questionType === 'mcq & coding';
      
      // If it has coding questions, fetch coding evaluation results
      if (hasCoding) {
        const codingEvaluation = await EvaluationResult.findOne({
          userId: submission.student._id,
          examId: submission.exam._id
        }).lean();
        
        if (codingEvaluation) {
          reportData.codingEvaluation = codingEvaluation;
        }
      }

      // Create combinedScore - ALWAYS show both MCQ and Coding breakdown
      let mcqScore = 0, mcqTotal = 0, codingScore = 0, codingTotal = 0;
      
      // Get MCQ scores if available
      if (reportData.score && (questionType === 'mcq' || questionType === 'mcq&coding' || questionType === 'mcq & coding')) {
        mcqScore = reportData.score.obtained || 0;
        mcqTotal = reportData.score.total || 0;
      }
      
      // Get Coding scores if available
      if (reportData.codingEvaluation && (questionType === 'coding' || questionType === 'mcq&coding' || questionType === 'mcq & coding')) {
        codingScore = reportData.codingEvaluation.totalScore || 0;
        codingTotal = reportData.codingEvaluation.maxPossibleScore || 0;
      }
      
      // Always create combinedScore with both MCQ and Coding breakdown
      reportData.combinedScore = {
        obtained: mcqScore + codingScore,
        total: mcqTotal + codingTotal,
        mcq: {
          obtained: mcqScore,
          total: mcqTotal
        },
        coding: {
          obtained: codingScore,
          total: codingTotal,
          evaluationStatus: reportData.codingEvaluation ? 'Evaluated' : (codingTotal > 0 ? 'Pending Evaluation' : 'No Coding Questions')
        }
      };
      
      console.log("Assessment Type:", questionType);
      console.log("Has MCQ:", hasMCQ);
      console.log("Has Coding:", hasCoding);
      console.log("Combined Score:", reportData.combinedScore);
      
      // Render the EJS template with the complete report data
      res.render('assessment_report', { 
        title: 'PrepZer0 Assessment Report',
        report: reportData,
        submissionId: submissionId,
        hasCoding: hasCoding,
        hasMCQ: hasMCQ,
        questionType: questionType
      });
    } catch (error) {
      console.error('Error in assessment report controller:', error);
      res.status(500).render('error', { 
        message: 'Failed to load assessment report',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
}
























// Keep the deleteSubmission function as is
exports.deleteSubmission = async (req, res) => {
  try {
    const { userId, examId, submissionId } = req.body;
    console.log(req.body)
    
    if (!userId || !examId || !submissionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: userId, examId, or submissionId' 
      });
    }
    
    // Delete submission record
    const deletedSubmission = await Submission.findByIdAndDelete(submissionId);
    if (!deletedSubmission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    // Delete integrity record
    const deletedIntegrity = await Integrity.findOneAndDelete({
      examId: examId,
      userId: userId
    });


      const deletedEvaluationResult = await EvaluationResult.findOneAndDelete({
      examId: examId,
      userId: userId
    });
        const deletedBatchStats = await mongoose.connection.db.collection('batchstatistics').deleteOne({
      examId: new mongoose.Types.ObjectId(examId),
      'statistics.userResults.userId': new mongoose.Types.ObjectId(userId)
    });
    
    // Delete or update batch statistics
    // Option 1: Delete the entire batch statistics (if you want to regenerate completely)
     const updatedActivityTracker = await ActivityTracker.findOneAndUpdate(
      {
        examId: examId,
        userId: userId
      },
      {
        $set: {
          isAllowedResubmit: true,
          status: "inactive", // Reset status
          lastPingTimestamp: new Date(),
          // Optionally reset startedAt if you want them to get a fresh start time
          // startedAt: null, // Uncomment if you want to reset start time
        },
        $push: {
          pingHistory: {
            timestamp: new Date(),
            status: "inactive"
          }
        }
      },
      { 
        new: true,
        upsert: true // Create if doesn't exist
      }
    );
    // Send success response even if integrity record wasn't found
    // (since the main goal was to delete the submission)
  return res.status(200).json({
      success: true,
      message: 'Records deleted successfully',
      deletedSubmission: deletedSubmission._id,
      deletedIntegrity: deletedIntegrity ? deletedIntegrity._id : 'Not found',
      deletedEvaluationResult: deletedEvaluationResult ? deletedEvaluationResult._id : 'Not found',
      deletedBatchStats: deletedBatchStats.deletedCount > 0 ? 'Deleted' : 'Not found',
      updatedActivityTracker: updatedActivityTracker ? updatedActivityTracker._id : 'Not found',
      redirectUrl: `/admin/exam/candidates/${examId}`
    });

    
  } catch (error) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};