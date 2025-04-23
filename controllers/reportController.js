const reportModel = require('../models/reportModel');




exports.viewAssessmentReport = async(req,res)=>{
    try {
        const submissionId = req.params.submissionId;
        
        if (!submissionId) {
          return res.status(400).send('Submission ID is required');
        }
        
        const reportData = await reportModel.getAssessmentReport(submissionId);
        
        // Render the EJS template with the report data
        res.render('assessment_report', { 
          title: 'PrepZer0 Assessment Report',
          report: reportData
        });
      } catch (error) {
        console.error('Error in assessment report controller:', error);
        res.status(500).render('error', { 
          message: 'Failed to load assessment report',
          error: process.env.NODE_ENV === 'development' ? error : {}
        });
      }
}