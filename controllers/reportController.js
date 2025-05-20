const reportModel = require('../models/reportModel');
const Submission = require("./../models/SubmissionSchema")
const Integrity = require("./../models/Integrity");
const { redirect } = require('express/lib/response');

// Add this to your reportController.js file

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






exports.viewAssessmentReport = async(req,res) => {
  try {
      const submissionId = req.params.submissionId;
      
      if (!submissionId) {
        return res.status(400).send('Submission ID is required');
      }
      
      const reportData = await reportModel.getAssessmentReport(submissionId);
      console.log(reportData)
      // Render the EJS template with the report data
      res.render('assessment_report', { 
        title: 'PrepZer0 Assessment Report',
        report: reportData,
        submissionId: submissionId  // Add this line
      });
    } catch (error) {
      console.error('Error in assessment report controller:', error);
      res.status(500).render('error', { 
        message: 'Failed to load assessment report',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
}








