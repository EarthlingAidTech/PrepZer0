const reportModel = require('../models/reportModel');
const Submission = require("./../models/SubmissionSchema");
const Integrity = require("./../models/Integrity");
const mongoose = require('mongoose');
const EvaluationResult = require('../models/EvaluationResultSchema');

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