const reportModel = require('../models/reportModel');
const Submission = require("./../models/SubmissionSchema");
const Integrity = require("./../models/Integrity");
const mongoose = require('mongoose');
const EvaluationResult = require('../models/EvaluationResultSchema');
const ActivityTracker = require('./../models/ActiveSession');

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


       // Get end time from submission
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
          
          // Format duration
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




      // Check if this is a coding exam or has coding questions
      const hasCoding = submission.exam.questionType === 'coding' || 
                       submission.exam.questionType === 'mcq&coding';
      
      // If it has coding questions, fetch coding evaluation results
      if (hasCoding) {
        // Find the coding evaluation result for this student and exam
        const codingEvaluation = await EvaluationResult.findOne({
          userId: submission.student._id,
          examId: submission.exam._id
        }).lean();
        
        // Add coding evaluation data to the report
        if (codingEvaluation) {
          reportData.codingEvaluation = codingEvaluation;
          
          // Add a combined score (MCQ + Coding)
          const mcqScore = reportData.score.obtained || 0;
          const mcqTotal = reportData.score.total || 0;
          
          const codingScore = codingEvaluation.totalScore || 
                             (codingEvaluation.results && codingEvaluation.results.totalScore) || 0;
          const codingTotal = 100; // Assuming coding is out of 100
          
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
              evaluationStatus: 'Evaluated',
              details: codingEvaluation.results || {},
              percentage: codingEvaluation.percentage || 
                         (codingEvaluation.results && codingEvaluation.results.percentage) || 0
            }
          };
        } else {
          // No coding evaluation results found - exam has coding questions but not evaluated yet
          reportData.codingEvaluation = null;
          reportData.combinedScore = {
            obtained: reportData.score.obtained || 0,
            total: reportData.score.total || 0,
            mcq: {
              obtained: reportData.score.obtained || 0,
              total: reportData.score.total || 0
            },
            coding: {
              obtained: 0,
              total: 100,
              evaluationStatus: 'Pending Evaluation',
              details: null
            }
          };
        }
      } else {
        // Exam doesn't have coding questions, just use MCQ score
        reportData.combinedScore = {
          obtained: reportData.score.obtained || 0,
          total: reportData.score.total || 0,
          mcq: {
            obtained: reportData.score.obtained || 0,
            total: reportData.score.total || 0
          }
        };
      }
      
      console.log("Complete Report Data:", {
        hasCoding: hasCoding,
        combinedScore: reportData.combinedScore,
        codingEvaluation: reportData.codingEvaluation ? 'Present' : 'Not found'
      });
      
      // Render the EJS template with the complete report data
      res.render('assessment_report', { 
        title: 'PrepZer0 Assessment Report',
        report: reportData,
        submissionId: submissionId,
        hasCoding: hasCoding
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
    
    // Send success response even if integrity record wasn't found
    // (since the main goal was to delete the submission)
    return res.status(200).json({
      success: true,
      message: 'Records deleted successfully',
      deletedSubmission: deletedSubmission._id,
      deletedIntegrity: deletedIntegrity ? deletedIntegrity._id : 'Not found',
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