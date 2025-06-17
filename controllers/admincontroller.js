const Exam = require("../models/Exam");
const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const { v4: uuidv4 } = require('uuid');
const passport =  require('passport');
const Submission = require('../models/SubmissionSchema');
const ActivityTracker = require('../models/ActiveSession');
const ReportModel = require('./../models/reportModel');
const mongoose = require('mongoose');
const { 
  evaluateSubmission, 
  batchEvaluateSubmissions, 
  getEvaluationResults,
  getAllEvaluationResults
} = require('../services/evaluationService');

const EvaluationResult = require('../models/EvaluationResultSchema')

exports.getcontrol = async(req,res)=>{
    if(req.isAuthenticated()){

        console.log("authenticated")
        const Userprofile = await User.findById({_id : req.user.id})

        if( Userprofile.usertype == "teacher"){
            const exams = await Exam.find().populate("createdBy", "name");
            res.render('admin', {
                pic: Userprofile.imageurl,
                logged_in: "true",
                exams : exams 
            });
        }
        else{
           res.redirect('/admin/login')
        }
    }
    else{
        res.redirect('/admin/login')
    }
}

exports.postcontrol = async(req,res)=>{

}


exports.logingetcontrol = async(req,res)=>{
    res.render('adminlogin')
}


exports.loginpostcontrol = async(req,res)=>{

    try {
        if( req.body.role == "teacher" ){
            const user =new User({
                email : req.body.email,
                password : req.body.password,
                usertype : req.body.role,
            })
           await req.login(user,function(err){
                if(err){
                    console.log(err)
                    res.render("invalid email or password ")
                }
                else{
                    passport.authenticate('local')(req,res,function(){
                        console.log("sessions loged  in sucessfully")
                        res.redirect('/admin')
                    })
                }
            })       

        }
                else if( req.body.role == "admin" ){
            const user =new User({
                email : req.body.email,
                password : req.body.password,
                usertype : req.body.role,
            })
           await req.login(user,function(err){
                if(err){
                    console.log(err)
                    res.render("invalid email or password ")
                }
                else{
                    passport.authenticate('local')(req,res,function(){
                        console.log("sessions loged  in sucessfully")
                        res.redirect('/supadmin')
                    })
                }
            })       

        }
        else{
            res.send("invalid role")
        }

    }catch(error){
        console.log(error)
        res.redirect('/admin')
    }
      

  
    
}

exports.signupgetcontrol = async(req,res)=>{
    res.render('adminsignup')
  
    
}
exports.signuppostcontrol = async(req,res)=>{

  
    try {
        if(req.body.password == req.body.passcode){

            randurl = uuidv4()

          
           badhttp = "https://placement.prepzer0.co.in/authenticate/verify/"+randurl
            try{
                await sendEmails({
                    email  : req.body.email ,
                    subject : "verify email",
                    html : "<h1 style='color : red;'>Email Verify </h1>  <a href="+badhttp+">"+badhttp+"</a>"
                })
                console.log("the email was sent tried to sent to be specific")

               }catch(error){
                   console.log(error)
                   console.log("maybe email was not sent")
               }
               console.log("whats happening")

        await  User.register({email : req.body.email,randomurl : randurl  ,usertype : req.body.role}, req.body.password ,(err,user)=>{
            if(err){   
                console.log(err)
                res.render('adminsignup',{errormsg : "email already taken"})
            }
            else{

                if(User.findOne({email : req.body.email , active : false}) != null ){
                    req.session.lau = req.body.email
                    console.log(req.lau)
                    console.log("sessions")
                    res.redirect('/admin/login')
                }else{
                    passport.authenticate('local')(req,res,function(){
                        res.redirect('/')
                        })
                }
            }
            console.log(user)
        })


    }else{
        res.render('adminsignup', {errormsg : "password did not mached"})
    }
     } catch (error) {
         console.log(error)
         res.redirect('/')
     }

    
}



    exports.allStudents = async(req, res) => {
        try {
            // Get filter parameters from query string
            const { semester, department, usn } = req.query;
            
            // Build filter object
            let filter = { usertype: "student" };
            
            // Add optional filters if they exist
            if (semester) {
                filter.Semester = semester;
            }
            
            if (department) {
                // Case insensitive search for department
                filter.Department = new RegExp(department, 'i');
            }
            
            if (usn) {
                // Case insensitive search for USN
                filter.USN = new RegExp(usn, 'i');
            }
            
            // Query the database with all filters
            const students = await User.find(filter)
                .select('-password -passwordresettoken -passwordresetdate') // Exclude sensitive fields
                .sort({ created: -1 }); // Sort by creation date, newest first
            

            console.log(students[0]);
            // Render the EJS template with the students data
            res.render('allstudentsprofile', { 
                students: students,
                title: 'All Students', 
                heading: 'Student Profiles',
                // Pass the current filter values to pre-populate the form
                currentFilters: {
                    semester: semester || '',
                    department: department || '',
                    usn: usn || ''
                }
            });
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).render('error', { 
                message: 'Failed to load student profiles',
                error: error
            });
        }
    };



/**
 * Get student exam history
 * GET /students/:studentId/exams
 */
exports.getStudentExams = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    // Find student by ID
    const student = await User.findOne({ _id: studentId });
    
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }
    
    // Find all submissions by this student
    const submissions = await Submission.find({ student: studentId })
      .populate({
        path: 'exam',
        match: { _id: { $ne: null } } // Only populate non-null exam references
      })
      .sort({ submittedAt: -1 }); // Sort by newest first
    
    // Filter out submissions where exam couldn't be populated (might be null)
    const validSubmissions = submissions.filter(sub => sub.exam != null);
    
    // Process submission data to prepare exam history with detailed reports
    const examHistory = await Promise.all(validSubmissions.map(async (submission) => {
      try {
        // Skip if submission or its exam is null or undefined
        if (!submission || !submission._id || !submission.exam) {
          console.log("Skipping invalid submission:", submission);
          return null;
        }
        
        // Get detailed report using ReportModel
        const detailedReport = await ReportModel.getAssessmentReport(submission._id);
        
        if (!detailedReport || !detailedReport.exam) {
          return null; // Skip if report or exam not found
        }
        
        // Calculate performance metrics
        const scorePercentage = Math.round((detailedReport.score.obtained / detailedReport.score.total * 100) * 10) / 10;
        const questionsAttempted = detailedReport.questions.filter(q => q.submittedAnswer !== 'Not answered').length;
        const totalQuestions = detailedReport.questions.length;
        
        // Calculate time taken in readable format
        const startTime = new Date(detailedReport.timeAnalysis.startTime);
        const endTime = new Date(detailedReport.timeAnalysis.endTime);
        const timeTakenMs = endTime - startTime;
        
        const hours = Math.floor(timeTakenMs / (1000 * 60 * 60));
        const minutes = Math.floor((timeTakenMs % (1000 * 60 * 60)) / (1000 * 60));
        const timeTaken = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        const examId = detailedReport.exam._id;
        const examDoc = await Exam.findOne({ _id: examId });
        const examName = examDoc ? examDoc.name : 'Untitled Exam';

        const scheduledAt = new Date(examDoc.scheduledAt);
        const scheduleTill = new Date(examDoc.scheduleTill);

        // Check if both are valid dates
        if (isNaN(scheduledAt) || isNaN(scheduleTill)) {
        console.error('Invalid date(s) in scheduledAt or scheduleTill');
        return {
            date: 'Invalid Date',
        };
        }

        const datePart = scheduledAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
        });

        const st = scheduledAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
        });

        const et = scheduleTill.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
        });

        const fullDate = `${datePart}, ${st} – ${et}`;

        
        return {
          id: submission._id, // Use submission ID for detailed report access
          examId: examId,
          title: examName,
          subject: detailedReport.exam.subject || 'Not specified',
          date: fullDate,
          scoreObtained: detailedReport.score.obtained,
          scoreTotal: detailedReport.score.total,
          scorePercentage: scorePercentage,
          questionsAttempted: questionsAttempted,
          totalQuestions: totalQuestions,
          timeTaken: timeTaken,
          submittedAt: new Date(submission.submittedAt).toLocaleString(),
          rank: detailedReport.ranking.rank,
          totalStudents: detailedReport.ranking.totalStudents,
          integrityStatus: detailedReport.integrity.status
        };
      } catch (error) {
        console.error(`Error processing exam report for submission ${submission?._id || 'unknown'}:`, error);
        console.error('Submission object:', JSON.stringify(submission, null, 2));
        // Return basic submission data as fallback
        if (!submission || !submission.exam) {
          return {
            id: submission ? submission._id : 'unknown',
            title: 'Exam Information Unavailable',
            subject: 'Not available',
            date: 'Unknown',
            scorePercentage: 0,
            submittedAt: submission ? new Date(submission.submittedAt).toLocaleString() : 'Unknown',
            note: 'Detailed report unavailable'
          };
        }
        
        return {
          id: submission._id,
          examId: submission.exam._id,
          title: submission.exam.title || 'Untitled Exam',
          subject: submission.exam.subject || 'Not specified',
          date: submission.exam.startTime ? new Date(submission.exam.startTime).toLocaleDateString() : 'Unknown',
          scorePercentage: (submission.score && submission.exam.totalMarks) ? 
            Math.round((submission.score / submission.exam.totalMarks * 100) * 10) / 10 : 0,
          submittedAt: new Date(submission.submittedAt).toLocaleString(),
          note: 'Detailed report unavailable'
        };
      }
    }));

    // Filter out any nulls from the exam history
    const validExamHistory = examHistory.filter(exam => exam !== null);
    
    // Render exam history view with enhanced data
    res.render('student_exam_history', {
      title: 'Exam History',
      student,
      examHistory: validExamHistory
    });
  } catch (error) {
    console.error('Error fetching student exam history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student exam history',
      error: error.message
    });
  }
};






exports.getExamDetailedReport = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    
    // Get detailed report using ReportModel
    const detailedReport = await ReportModel.getAssessmentReport(submissionId);
    
    if (!detailedReport) {
      return res.status(404).json({ 
        success: false,
        message: 'Exam report not found' 
      });
    }
    
    // Render detailed report view
    res.render('exam_detailed_report', {
      title: 'Exam Report',
      report: detailedReport
    });
  } catch (error) {
    console.error('Error fetching exam report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam report',
      error: error.message
    });
  }
};

/**
 * Get student performance summary
 * GET /students/:usn/performance
 */
exports.getStudentPerformance = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    // Find student
    const student = await Student.findOne({ _id: studentId });
    
    if (!student) {
      return res.status(404).render('error', { 
        message: 'Student not found',
        error: { status: 404 }
      });
    }
    
    // Find all submissions for this student
    const submissions = await Submission.find({ student: studentUSN }).populate('exam');
    
    if (submissions.length === 0) {
      return res.render('student-performance', {
        title: 'Student Performance',
        student,
        hasData: false,
        performanceData: null
      });
    }
    
    // Calculate average score and other metrics
    let totalScore = 0;
    let totalExams = submissions.length;
    let subjectPerformance = {};
    
    // Process each submission
    for (const submission of submissions) {
      const exam = await Exam.findById(submission.exam);
      if (!exam) continue;
      
      // Calculate score percentage for this exam
      const scorePercentage = submission.score / exam.totalMarks * 100;
      totalScore += scorePercentage;
      
      // Track subject performance
      if (!subjectPerformance[exam.subject]) {
        subjectPerformance[exam.subject] = {
          totalScore: 0,
          examCount: 0
        };
      }
      
      subjectPerformance[exam.subject].totalScore += scorePercentage;
      subjectPerformance[exam.subject].examCount += 1;
    }
    
    // Calculate average score
    const averageScore = Math.round((totalScore / totalExams) * 10) / 10;
    
    // Calculate average score per subject
    const subjectAverages = {};
    for (const subject in subjectPerformance) {
      const { totalScore, examCount } = subjectPerformance[subject];
      subjectAverages[subject] = Math.round((totalScore / examCount) * 10) / 10;
    }
    
    // Render performance view
    res.render('student-performance', {
      title: 'Student Performance',
      student,
      hasData: true,
      performanceData: {
        totalExams,
        averageScore,
        subjectAverages
      }
    });
  } catch (error) {
    console.error('Error fetching student performance:', error);
    res.status(500).render('error', {
      message: 'Error fetching student performance',
      error: { status: 500 }
    });
  }
};








// routes/evaluation.js


// Endpoint to evaluate a single student's submission
const evalsssinglecod = async (req, res) => {
  try {
    const { examId, userId } = req.params;
    // const storeResults = req.query.store !== 'false'; // Default to true
    
    const results = await evaluateSubmission(userId, examId);
    console.log()
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this route handler to your admin controller or create a separate evaluation controller

/**
 * Evaluate all coding submissions for an exam
 * GET /admin/exam/:examId/evaluate-all
 */
exports.evaluateAllSubmissions = async (req, res) => {
    try {
        const examId = req.params.examId;

        // Validate exam ID
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID'
            });
        }

        // Fetch the exam to ensure it exists and has coding questions
        const exam = await Exam.findById(examId).populate('codingQuestions');
        
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Check if exam has coding questions
        const hasCoding = exam.questionType === 'coding' || exam.questionType === 'mcq&coding';
        
        if (!hasCoding) {
            return res.status(400).json({
                success: false,
                message: 'This exam does not have coding questions to evaluate'
            });
        }

        // Get all submissions for this exam
        const submissions = await Submission.find({ exam: examId })
            .populate('student', 'USN fname lname _id')
            .select('student _id');

        if (submissions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No submissions found for this exam'
            });
        }

        // Extract student IDs
        const submissionUserIds = submissions
            .map(submission => submission.student && submission.student._id ? 
                submission.student._id.toString() : null)
            .filter(id => id !== null);

        console.log(`Found ${submissionUserIds.length} submissions to potentially evaluate`);

        // Check which students already have evaluation results
        const EvaluationResult = mongoose.models.EvaluationResult || 
            mongoose.model('EvaluationResult', require('../models/EvaluationResultSchema'));

        const existingEvaluations = await EvaluationResult.find({
            examId: examId,
            userId: { $in: submissionUserIds }
        }).select('userId');

        // Create a set of user IDs that already have evaluations
        const evaluatedUserIds = new Set(
            existingEvaluations.map(eval => eval.userId.toString())
        );

        console.log(`Found ${evaluatedUserIds.size} students already evaluated`);

        // Filter out students who already have evaluations
        const unevaluatedUserIds = submissionUserIds.filter(
            userId => !evaluatedUserIds.has(userId)
        );

        console.log(`${unevaluatedUserIds.length} students need evaluation`);

        if (unevaluatedUserIds.length === 0) {
            return res.json({
                success: true,
                message: 'All submissions have already been evaluated',
                data: {
                    totalSubmissions: submissionUserIds.length,
                    alreadyEvaluated: evaluatedUserIds.size,
                    newlyEvaluated: 0,
                    skipped: 0,
                    errors: []
                }
            });
        }

        console.log(`Starting batch evaluation for ${unevaluatedUserIds.length} students...`);

        // Start the batch evaluation process
        const startTime = Date.now();
        
        try {
            // Run batch evaluation for unevaluated students only
            const batchResults = await batchEvaluateSubmissions(examId, unevaluatedUserIds);
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000); // seconds

            console.log(`Batch evaluation completed in ${duration} seconds`);

            // Process the results
            const evaluationResults = batchResults.results || [];
            const errors = batchResults.errors || [];

            // Count successful evaluations
            const successfulEvaluations = evaluationResults.length;
            const failedEvaluations = errors.length;

            // Log summary
            console.log(`Evaluation Summary:
                - Total to evaluate: ${unevaluatedUserIds.length}
                - Successfully evaluated: ${successfulEvaluations}
                - Failed evaluations: ${failedEvaluations}
                - Duration: ${duration} seconds`);

            // Return detailed response
            return res.json({
                success: true,
                message: `Evaluation completed! ${successfulEvaluations} students evaluated successfully${failedEvaluations > 0 ? `, ${failedEvaluations} failed` : ''}`,
                data: {
                    totalSubmissions: submissionUserIds.length,
                    alreadyEvaluated: evaluatedUserIds.size,
                    newlyEvaluated: successfulEvaluations,
                    failed: failedEvaluations,
                    duration: duration,
                    errors: errors.length > 0 ? errors : null,
                    statistics: batchResults.statistics || null
                }
            });

        } catch (batchError) {
            console.error('Batch evaluation failed:', batchError);
            
            return res.status(500).json({
                success: false,
                message: `Batch evaluation failed: ${batchError.message}`,
                data: {
                    totalSubmissions: submissionUserIds.length,
                    alreadyEvaluated: evaluatedUserIds.size,
                    newlyEvaluated: 0,
                    failed: unevaluatedUserIds.length,
                    error: batchError.message
                }
            });
        }

    } catch (error) {
        console.error('Error in evaluateAllSubmissions:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Internal server error during evaluation',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
};

/**
 * Get evaluation status for an exam (without triggering evaluation)
 * GET /admin/exam/:examId/evaluation-status
 */
exports.getEvaluationStatus = async (req, res) => {
    try {
        const examId = req.params.examId;

        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID'
            });
        }

        // Get all submissions for this exam
        const submissions = await Submission.find({ exam: examId })
            .populate('student', '_id')
            .select('student');

        const submissionUserIds = submissions
            .map(s => s.student && s.student._id ? s.student._id.toString() : null)
            .filter(id => id !== null);

        // Check existing evaluations
        const EvaluationResult = mongoose.models.EvaluationResult || 
            mongoose.model('EvaluationResult', require('../models/EvaluationResultSchema'));

        const existingEvaluations = await EvaluationResult.find({
            examId: examId,
            userId: { $in: submissionUserIds }
        }).select('userId totalScore maxPossibleScore percentage');

        const evaluatedCount = existingEvaluations.length;
        const pendingCount = submissionUserIds.length - evaluatedCount;

        return res.json({
            success: true,
            data: {
                total: submissionUserIds.length,
                evaluated: evaluatedCount,
                pending: pendingCount,
                evaluations: existingEvaluations
            }
        });

    } catch (error) {
        console.error('Error getting evaluation status:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting evaluation status',
            error: error.message
        });
    }
};

/**
 * Re-evaluate specific students (for failed evaluations)
 * POST /admin/exam/:examId/re-evaluate
 * Body: { userIds: ["userId1", "userId2", ...] }
 */
exports.reEvaluateSubmissions = async (req, res) => {
    try {
        const examId = req.params.examId;
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of user IDs to re-evaluate'
            });
        }

        console.log(`Re-evaluating ${userIds.length} students for exam ${examId}`);

        const batchResults = await batchEvaluateSubmissions(examId, userIds);
        
        const successfulEvaluations = batchResults.results ? batchResults.results.length : 0;
        const errors = batchResults.errors || [];

        return res.json({
            success: true,
            message: `Re-evaluation completed! ${successfulEvaluations} students re-evaluated${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
            data: {
                evaluated: successfulEvaluations,
                failed: errors.length,
                errors: errors.length > 0 ? errors : null
            }
        });

    } catch (error) {
        console.error('Error in re-evaluation:', error);
        return res.status(500).json({
            success: false,
            message: 'Re-evaluation failed',
            error: error.message
        });
    }
};






// exports.examCandidates = async(req, res) => {
//     try {
//         const examId = req.params.examId;

//         // Fetch the exam details with populated questions
//         const exam = await Exam.findById(examId)
//             .populate('mcqQuestions')
//             .populate('codingQuestions');
        
//         if (!exam) {
//             return res.status(404).render('error', { 
//                 message: 'Exam not found',
//                 error: { status: 404, stack: '' } 
//             });
//         }
        
//         // Determine if this exam has MCQ questions, coding questions, or both
//         const hasMCQ = exam.questionType === 'mcq' || exam.questionType === 'mcq&coding';
//         const hasCoding = exam.questionType === 'coding' || exam.questionType === 'mcq&coding';
        
//         // Calculate maximum possible scores
//         let maxMCQScore = 0;
//         if (hasMCQ && exam.mcqQuestions && exam.mcqQuestions.length > 0) {
//             maxMCQScore = exam.mcqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
//         }
        
//         let maxCodingScore = 0;
//         if (hasCoding && exam.codingQuestions && exam.codingQuestions.length > 0) {
//             maxCodingScore = exam.codingQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
//         }
        
//         // Fetch all submissions related to this exam
//         const submissions = await Submission.find({ exam: examId })
//             .populate('student', 'USN email Department Semester Rollno _id fname lname') 
//             .sort({ submittedAt: -1 }); // Most recent submissions first
        
//         // Create a set of student IDs who have submitted
//         const submittedStudentIds = new Set();
//         submissions.forEach(submission => {
//             if (submission.student && submission.student._id) {
//                 submittedStudentIds.add(submission.student._id.toString());
//             }
//         });

//         // MODIFIED: Only check for existing evaluations, don't create new ones
//         let evaluationMap = new Map();
//         if (hasCoding) {
//             // Get the user IDs from submissions
//             const submissionUserIds = submissions.map(submission => 
//                 submission.student && submission.student._id ? 
//                 submission.student._id.toString() : null
//             ).filter(id => id !== null);
            
//             // Check which students already have evaluation results (READ ONLY)
//             const EvaluationResult = mongoose.models.EvaluationResult || 
//                 mongoose.model('EvaluationResult', evaluationResultSchema);
            
//             const existingEvaluations = await EvaluationResult.find({
//                 examId: examId,
//                 userId: { $in: submissionUserIds }
//             }).select('userId totalScore maxPossibleScore percentage');
            
//             console.log(`Found ${existingEvaluations.length} students with existing evaluations`);
            
//             // Create a map of user ID to evaluation result for easy lookup
//             existingEvaluations.forEach(eval => {
//                 evaluationMap.set(eval.userId.toString(), eval);
//             });
            
//             // Log evaluation status without triggering new evaluations
//             const evaluatedCount = existingEvaluations.length;
//             const totalSubmissions = submissionUserIds.length;
//             const pendingCount = totalSubmissions - evaluatedCount;
            
//             console.log(`Evaluation Status - Total: ${totalSubmissions}, Evaluated: ${evaluatedCount}, Pending: ${pendingCount}`);
//         }
        
//         // Fetch active sessions for this exam
//         const activeSessions = await ActivityTracker.find({ examId: examId })
//             .populate('userId', 'USN email Department Semester Rollno _id fname lname')
//             .select('userId status lastPingTimestamp')
//             .sort({ lastPingTimestamp: -1 });
            
//         // Update status to offline for students who have submitted
//         const updatePromises = [];
//         activeSessions.forEach(session => {
//             if (session.userId && session.userId._id) {
//                 const studentId = session.userId._id.toString();
                
//                 // If student has submitted, update their status to offline
//                 if (submittedStudentIds.has(studentId) && session.status !== 'offline') {
//                     updatePromises.push(
//                         ActivityTracker.findByIdAndUpdate(
//                             session._id,
//                             { 
//                                 status: 'offline',
//                                 $push: { 
//                                     pingHistory: { 
//                                         timestamp: new Date(), 
//                                         status: 'offline' 
//                                     } 
//                                 }
//                             }
//                         )
//                     );
                    
//                     // Update the session object to reflect the new status
//                     session.status = 'offline';
//                 }
//             }
//         });
        
//         // Execute all update promises
//         if (updatePromises.length > 0) {
//             await Promise.all(updatePromises);
//         }
        
//         // Convert active sessions to a map for easy lookup
//         const activeSessionsMap = new Map();
//         activeSessions.forEach(session => {
//             // Skip if userId is not properly populated
//             if (!session.userId || !session.userId._id) return;
            
//             const userId = session.userId._id.toString();
//             activeSessionsMap.set(userId, {
//                 status: session.status, 
//                 lastPing: session.lastPingTimestamp,
//                 studentInfo: session.userId
//             });
//         });
        
//         // Process all submissions
//         const studentMap = new Map();
//         for (const submission of submissions) {
//             if (submission.student && submission.student._id && !studentMap.has(submission.student._id.toString())) {
//                 const studentId = submission.student._id.toString();
//                 const activeSession = activeSessionsMap.get(studentId);
                
//                 // Get MCQ score using ReportModel
//                 let mcqScore = 0;
//                 let report = null;
                
//                 if (hasMCQ && submission._id) {
//                     try {
//                         // Get assessment report for MCQ scores
//                         report = await ReportModel.getAssessmentReport(submission._id);
//                         if (report && report.score) {
//                             mcqScore = report.score.obtained;
//                         }
//                     } catch (error) {
//                         console.error(`Error getting report for submission ${submission._id}:`, error);
//                         // Fallback: If ReportModel fails, try to calculate MCQ score manually
//                         if (submission.mcqAnswers && submission.mcqAnswers.length > 0) {
//                             // Calculate MCQ score from submission data
//                             let calculatedMCQScore = 0;
//                             for (const answer of submission.mcqAnswers) {
//                                 try {
//                                     const question = await mongoose.model('MCQ').findById(answer.questionId);
//                                     if (question && answer.selectedOption === question.correctAnswer) {
//                                         calculatedMCQScore += question.marks || 0;
//                                     }
//                                 } catch (err) {
//                                     console.error('Error calculating MCQ score:', err);
//                                 }
//                             }
//                             mcqScore = calculatedMCQScore;
//                         }
//                     }
//                 }
                
//                 // MODIFIED: Only check existing coding evaluation scores, don't create new ones
//                 let codingScore = 0;
//                 let isEvaluated = false;
                
//                 if (hasCoding) {
//                     const evaluation = evaluationMap.get(studentId);
//                     if (evaluation) {
//                         // Use totalScore from the existing evaluation result
//                         codingScore = evaluation.totalScore || 0;
//                         isEvaluated = true;
//                     }
//                     // If no evaluation exists, codingScore remains 0 and isEvaluated remains false
//                 }
                
//                 // Calculate total score
//                 const totalScore = mcqScore + codingScore;
//                 const totalPossible = maxMCQScore + maxCodingScore;
                
//                 // Format display score
//                 let displayScore = '';
//                 if (hasMCQ && hasCoding) {
//                     if (isEvaluated) {
//                         displayScore = `${totalScore}/${totalPossible}`;
//                     } else {
//                         displayScore = `${mcqScore}/${maxMCQScore} + Pending`;
//                     }
//                 } else if (hasMCQ) {
//                     displayScore = `${mcqScore}/${maxMCQScore}`;
//                 } else if (hasCoding) {
//                     if (isEvaluated) {
//                         displayScore = `${codingScore}/${maxCodingScore}`;
//                     } else {
//                         displayScore = 'Pending Evaluation';
//                     }
//                 } else {
//                     displayScore = 'N/A';
//                 }
                
//                 studentMap.set(studentId, {
//                     student: submission.student,
//                     submission: submission,
//                     score: displayScore,
//                     mcqScore: mcqScore,
//                     codingScore: codingScore,
//                     totalScore: totalScore,
//                     maxMCQScore: maxMCQScore,
//                     maxCodingScore: maxCodingScore,
//                     maxTotalScore: totalPossible,
//                     evaluationStatus: hasCoding ? 
//                         (isEvaluated ? 'Evaluated' : 'Pending Evaluation') : 'N/A',
//                     submittedAt: submission.submittedAt,
//                     activityStatus: activeSession ? activeSession.status : 'offline',
//                     lastActive: activeSession ? activeSession.lastPing : null,
//                     hasSubmitted: true
//                 });
                
//                 // Remove from active sessions map to avoid duplicates
//                 activeSessionsMap.delete(studentId);
//             }
//         }
        
//         // Process active sessions of students who haven't submitted
//         activeSessionsMap.forEach((session, studentId) => {
//             if (!submittedStudentIds.has(studentId)) {
//                 studentMap.set(studentId, {
//                     student: session.studentInfo,
//                     submission: null,
//                     score: 'In progress',
//                     mcqScore: 0,
//                     codingScore: 0,
//                     totalScore: 0,
//                     maxMCQScore: maxMCQScore,
//                     maxCodingScore: maxCodingScore,
//                     maxTotalScore: maxMCQScore + maxCodingScore,
//                     evaluationStatus: 'Not submitted',
//                     submittedAt: null,
//                     activityStatus: session.status,
//                     lastActive: session.lastPing,
//                     hasSubmitted: false
//                 });
//             }
//         });
        
//         const candidates = Array.from(studentMap.values());
        
//         // Sort candidates: active students first, then by submission status and time
//         candidates.sort((a, b) => {
//             // First prioritize active status
//             if (a.activityStatus === 'active' && b.activityStatus !== 'active') return -1;
//             if (a.activityStatus !== 'active' && b.activityStatus === 'active') return 1;
            
//             // Then by submission status (submitted after non-submitted)
//             if (a.hasSubmitted && !b.hasSubmitted) return -1;
//             if (!a.hasSubmitted && b.hasSubmitted) return 1;
            
//             // If both have submitted, sort by total score (higher first)
//             if (a.hasSubmitted && b.hasSubmitted) {
//                 if (a.totalScore !== b.totalScore) {
//                     return b.totalScore - a.totalScore;
//                 }
//             }
            
//             // Then by submission time (most recent first)
//             if (a.submittedAt && b.submittedAt) {
//                 return new Date(b.submittedAt) - new Date(a.submittedAt);
//             }
            
//             // Finally by last active time
//             if (a.lastActive && b.lastActive) {
//                 return new Date(b.lastActive) - new Date(a.lastActive);
//             }
            
//             return 0;
//         });
        
//         // MODIFIED: Calculate evaluation summary without triggering evaluations
//         const evaluationSummary = hasCoding ? {
//             total: submissions.length,
//             evaluated: submissions.filter(s => 
//                 s.student && s.student._id && evaluationMap.has(s.student._id.toString())
//             ).length,
//             pending: submissions.filter(s => 
//                 s.student && s.student._id && !evaluationMap.has(s.student._id.toString())
//             ).length
//         } : { total: 0, evaluated: 0, pending: 0 };
        
//         // Render the candidates view
//         res.render('exam_candidates', {
//             title: `Candidates for ${exam.name}`,
//             exam: exam,
//             candidates: candidates,
//             hasMCQ: hasMCQ,
//             hasCoding: hasCoding,
//             scoreSummary: {
//                 maxMCQScore: maxMCQScore,
//                 maxCodingScore: maxCodingScore,
//                 maxTotalScore: maxMCQScore + maxCodingScore
//             },
//             evaluationResults: evaluationSummary
//         });
        
//     } catch (error) {
//         console.error('Error fetching exam candidates:', error);
//         res.status(500).render('error', { 
//             message: 'Error fetching exam candidates',
//             error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' } 
//         });
//     }
// }














exports.examCandidates = async(req, res) => {
    try {
        const examId = req.params.examId;
        
        // Check if this is an AJAX request for data
        const isAjaxDataRequest = req.query.ajax === 'true' || 
                                  req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                                  req.headers.accept && req.headers.accept.includes('application/json');
        
        if (isAjaxDataRequest) {
            // Handle AJAX request - return JSON data
            return await handleCandidatesDataRequest(req, res, examId);
        }
        
        // Handle regular page request - return HTML
        return await handleCandidatesPageRequest(req, res, examId);
        
    } catch (error) {
        console.error('Error in examCandidates:', error);
        if (req.query.ajax === 'true' || req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        } else {
            return res.status(500).render('error', { 
                message: 'Error fetching exam candidates',
                error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' } 
            });
        }
    }
};

// Helper function for page requests (your existing examCandidates logic)
async function handleCandidatesPageRequest(req, res, examId) {
    // Fetch the exam details with populated questions
    const exam = await Exam.findById(examId)
        .populate('mcqQuestions')
        .populate('codingQuestions');
    
    if (!exam) {
        return res.status(404).render('error', { 
            message: 'Exam not found',
            error: { status: 404, stack: '' } 
        });
    }
    
    // Determine if this exam has MCQ questions, coding questions, or both
    const hasMCQ = exam.questionType === 'mcq' || exam.questionType === 'mcq&coding';
    const hasCoding = exam.questionType === 'coding' || exam.questionType === 'mcq&coding';
    
    // Calculate maximum possible scores
    let maxMCQScore = 0;
    if (hasMCQ && exam.mcqQuestions && exam.mcqQuestions.length > 0) {
        maxMCQScore = exam.mcqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    }
    
    let maxCodingScore = 0;
    if (hasCoding && exam.codingQuestions && exam.codingQuestions.length > 0) {
        maxCodingScore = exam.codingQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
    }
    
    // MODIFIED: Only get evaluation summary for coding exams
    let evaluationSummary = { total: 0, evaluated: 0, pending: 0 };
    
    if (hasCoding) {
        // Get total submissions count
        const totalSubmissions = await Submission.countDocuments({ exam: examId });
        
        // Get evaluated submissions count
        const submittedStudentIds = await Submission.find({ exam: examId })
            .select('student')
            .lean();
        
        const studentIds = submittedStudentIds
            .map(s => s.student ? s.student.toString() : null)
            .filter(id => id !== null);
        
        const EvaluationResult = mongoose.models.EvaluationResult || 
            mongoose.model('EvaluationResult', evaluationResultSchema);
        
        const evaluatedCount = await EvaluationResult.countDocuments({
            examId: examId,
            userId: { $in: studentIds }
        });
        
        evaluationSummary = {
            total: totalSubmissions,
            evaluated: evaluatedCount,
            pending: totalSubmissions - evaluatedCount
        };
    }
    
    // Get total candidates count for display
    const totalCandidatesCount = await Submission.countDocuments({ exam: examId });
    
    // Render the candidates view WITHOUT candidate data (will be loaded via AJAX)
    res.render('exam_candidates1', {
        title: `Candidates for ${exam.name}`,
        exam: exam,
        candidates: [], // EMPTY - will be loaded via AJAX
        hasMCQ: hasMCQ,
        hasCoding: hasCoding,
        scoreSummary: {
            maxMCQScore: maxMCQScore,
            maxCodingScore: maxCodingScore,
            maxTotalScore: maxMCQScore + maxCodingScore
        },
        evaluationResults: evaluationSummary,
        totalCandidates: totalCandidatesCount
    });
}

// Helper function for AJAX requests (your existing examCandidatesData logic)
async function handleCandidatesDataRequest(req, res, examId) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const departmentFilter = req.query.department || '';
    const statusFilter = req.query.status || '';
    
    const skip = (page - 1) * limit;

    // Fetch the exam details
    const exam = await Exam.findById(examId)
        .populate('mcqQuestions')
        .populate('codingQuestions');
    
    if (!exam) {
        return res.status(404).json({ 
            success: false, 
            message: 'Exam not found' 
        });
    }
    
    // Determine if this exam has MCQ questions, coding questions, or both
    const hasMCQ = exam.questionType === 'mcq' || exam.questionType === 'mcq&coding';
    const hasCoding = exam.questionType === 'coding' || exam.questionType === 'mcq&coding';


    let maxCodingScore = 0;
    if (hasCoding) {
        const codingEvaluation = await EvaluationResult.findOne({
            examId: exam._id
        }).lean();   
        maxCodingScore = codingEvaluation ? (codingEvaluation.maxPossibleScore || 0) : 0;
    }

    // Calculate maximum possible scores
    let maxMCQScore = 0;
    if (hasMCQ && exam.mcqQuestions && exam.mcqQuestions.length > 0) {
        maxMCQScore = exam.mcqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    }
    
    
    // if (hasCoding && exam.codingQuestions && exam.codingQuestions.length > 0) {
    //     maxCodingScore = exam.codingQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
    // }
    
    // Build base query for submissions
    let submissionQuery = { exam: examId };
    
    // Apply search filter if provided
    if (search) {
        // First get matching students
        const studentSearchQuery = {
            $or: [
                { USN: { $regex: search, $options: 'i' } },
                { Rollno: { $regex: search, $options: 'i' } },
                { Department: { $regex: search, $options: 'i' } }
            ]
        };
        
        const matchingStudents = await mongoose.model('Student').find(studentSearchQuery).select('_id');
        const studentIds = matchingStudents.map(s => s._id);
        
        submissionQuery.student = { $in: studentIds };
    }
    
    // Fetch submissions based on query
    const submissions = await Submission.find(submissionQuery)
        .populate('student', 'USN email Department Semester Rollno _id fname lname')
        .sort({ submittedAt: -1 });
    
    // Apply department filter
    let filteredSubmissions = submissions;
    if (departmentFilter) {
        filteredSubmissions = submissions.filter(s => 
            s.student && s.student.Department === departmentFilter
        );
    }
    
    // Create a set of student IDs who have submitted
    const submittedStudentIds = new Set();
    filteredSubmissions.forEach(submission => {
        if (submission.student && submission.student._id) {
            submittedStudentIds.add(submission.student._id.toString());
        }
    });

    // Get evaluation map for coding exams
    let evaluationMap = new Map();
    if (hasCoding) {
        const submissionUserIds = filteredSubmissions.map(submission => 
            submission.student && submission.student._id ? 
            submission.student._id.toString() : null
        ).filter(id => id !== null);
        
        const EvaluationResult = mongoose.models.EvaluationResult || 
            mongoose.model('EvaluationResult', evaluationResultSchema);
        
        const existingEvaluations = await EvaluationResult.find({
            examId: examId,
            userId: { $in: submissionUserIds }
        }).select('userId totalScore maxPossibleScore percentage');
        
        existingEvaluations.forEach(eval => {
            evaluationMap.set(eval.userId.toString(), eval);
        });
    }
    
    // Fetch active sessions for this exam
    const activeSessions = await ActivityTracker.find({ examId: examId })
        .populate('userId', 'USN email Department Semester Rollno _id fname lname')
        .select('userId status lastPingTimestamp')
        .sort({ lastPingTimestamp: -1 });
    
    // Update status to offline for students who have submitted
    const updatePromises = [];
    activeSessions.forEach(session => {
        if (session.userId && session.userId._id) {
            const studentId = session.userId._id.toString();
            
            if (submittedStudentIds.has(studentId) && session.status !== 'offline') {
                updatePromises.push(
                    ActivityTracker.findByIdAndUpdate(
                        session._id,
                        { 
                            status: 'offline',
                            $push: { 
                                pingHistory: { 
                                    timestamp: new Date(), 
                                    status: 'offline' 
                                } 
                            }
                        }
                    )
                );
                session.status = 'offline';
            }
        }
    });
    
    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
    }
    
    // Convert active sessions to a map
    const activeSessionsMap = new Map();
    activeSessions.forEach(session => {
        if (!session.userId || !session.userId._id) return;
        
        const userId = session.userId._id.toString();
        activeSessionsMap.set(userId, {
            status: session.status, 
            lastPing: session.lastPingTimestamp,
            studentInfo: session.userId
        });
    });
    
    // Process all submissions and active sessions
    const studentMap = new Map();
    
    // Process submitted students
    for (const submission of filteredSubmissions) {
        if (submission.student && submission.student._id && !studentMap.has(submission.student._id.toString())) {
            const studentId = submission.student._id.toString();
            const activeSession = activeSessionsMap.get(studentId);
            
            // Get MCQ score
            let mcqScore = 0;
            if (hasMCQ && !hasCoding && submission._id) {
                try {
                    const report = await ReportModel.getAssessmentReport(submission._id);
                    if (report && report.score) {
                        mcqScore = report.score.obtained;
                    }
                } catch (error) {
                    console.error(`Error getting report for submission ${submission._id}:`, error);
                    if (submission.mcqAnswers && submission.mcqAnswers.length > 0) {
                        let calculatedMCQScore = 0;
                        for (const answer of submission.mcqAnswers) {
                            try {
                                const question = await mongoose.model('MCQ').findById(answer.questionId);
                                if (question && answer.selectedOption === question.correctAnswer) {
                                    calculatedMCQScore += question.marks || 0;
                                }
                            } catch (err) {
                                console.error('Error calculating MCQ score:', err);
                            }
                        }
                        mcqScore = calculatedMCQScore;
                    }
                }
            }else if(hasMCQ && hasCoding && submission._id){
                try {
                    const report = await ReportModel.getAssessmentReport(submission._id);
                    if (report && report.score) {
                        mcqScore = report.score.mcq.obtained;
                    }
                } catch (error) {
                    console.error(`Error getting report for submission ${submission._id}:`, error);
                    if (submission.mcqAnswers && submission.mcqAnswers.length > 0) {
                        let calculatedMCQScore = 0;
                        for (const answer of submission.mcqAnswers) {
                            try {
                                const question = await mongoose.model('MCQ').findById(answer.questionId);
                                if (question && answer.selectedOption === question.correctAnswer) {
                                    calculatedMCQScore += question.marks || 0;
                                }
                            } catch (err) {
                                console.error('Error calculating MCQ score:', err);
                            }
                        }
                        mcqScore = calculatedMCQScore;
                    }
                }
            }
            
            // Get coding score
            let codingScore = 0;
            let isEvaluated = false;
            
            if (hasCoding) {
                const evaluation = evaluationMap.get(studentId);
                if (evaluation) {
                    codingScore = evaluation.totalScore || 0;
                    isEvaluated = true;
                }
            }

            const totalScore = mcqScore + codingScore;
            const totalPossible = maxMCQScore + maxCodingScore;
            
            let displayScore = '';
            if (hasMCQ && hasCoding) {
                if (isEvaluated) {
                    displayScore = `${totalScore}/${totalPossible}`;
                } else {
                    displayScore = `${mcqScore}/${maxMCQScore} + Pending`;
                }
            } else if (hasMCQ) {
                displayScore = `${mcqScore}/${maxMCQScore}`;
            } else if (hasCoding) {
                if (isEvaluated) {
                    displayScore = `${codingScore}/${maxCodingScore}`;
                } else {
                    displayScore = 'Pending Evaluation';
                }
            } else {
                displayScore = 'N/A';
            }
            
            studentMap.set(studentId, {
                student: submission.student,
                submission: submission,
                score: displayScore,
                mcqScore: mcqScore,
                codingScore: codingScore,
                totalScore: totalScore,
                maxMCQScore: maxMCQScore,
                maxCodingScore: maxCodingScore,
                maxTotalScore: totalPossible,
                evaluationStatus: hasCoding ? 
                    (isEvaluated ? 'Evaluated' : 'Pending Evaluation') : 'N/A',
                submittedAt: submission.submittedAt,
                activityStatus: activeSession ? activeSession.status : 'offline',
                lastActive: activeSession ? activeSession.lastPing : null,
                hasSubmitted: true
            });
            
            activeSessionsMap.delete(studentId);
        }
    }
    
    // Process active sessions of students who haven't submitted
    activeSessionsMap.forEach((session, studentId) => {
        if (!submittedStudentIds.has(studentId)) {
            // Apply department filter for active sessions
            if (departmentFilter && session.studentInfo.Department !== departmentFilter) {
                return; // Skip this student
            }
            
            // Apply search filter for active sessions
            if (search) {
                const student = session.studentInfo;
                const searchLower = search.toLowerCase();
                const matchesSearch = 
                    (student.USN && student.USN.toLowerCase().includes(searchLower)) ||
                    (student.Rollno && student.Rollno.toLowerCase().includes(searchLower)) ||
                    (student.Department && student.Department.toLowerCase().includes(searchLower));
                
                if (!matchesSearch) {
                    return; // Skip this student
                }
            }
            
            studentMap.set(studentId, {
                student: session.studentInfo,
                submission: null,
                score: 'In progress',
                mcqScore: 0,
                codingScore: 0,
                totalScore: 0,
                maxMCQScore: maxMCQScore,
                maxCodingScore: maxCodingScore,
                maxTotalScore: maxMCQScore + maxCodingScore,
                evaluationStatus: 'Not submitted',
                submittedAt: null,
                activityStatus: session.status,
                lastActive: session.lastPing,
                hasSubmitted: false
            });
        }
    });
    
    let candidates = Array.from(studentMap.values());
    
    // Apply status filter
    if (statusFilter) {
        switch (statusFilter) {
            case 'submitted':
                candidates = candidates.filter(c => c.hasSubmitted);
                break;
            case 'active':
                candidates = candidates.filter(c => c.activityStatus === 'active' && !c.hasSubmitted);
                break;
            case 'inactive':
                candidates = candidates.filter(c => c.activityStatus !== 'active' && !c.hasSubmitted);
                break;
        }
    }
    
    // Sort candidates
    candidates.sort((a, b) => {
        if (a.activityStatus === 'active' && b.activityStatus !== 'active') return -1;
        if (a.activityStatus !== 'active' && b.activityStatus === 'active') return 1;
        
        if (a.hasSubmitted && !b.hasSubmitted) return -1;
        if (!a.hasSubmitted && b.hasSubmitted) return 1;
        
        if (a.hasSubmitted && b.hasSubmitted) {
            if (a.totalScore !== b.totalScore) {
                return b.totalScore - a.totalScore;
            }
        }
        
        if (a.submittedAt && b.submittedAt) {
            return new Date(b.submittedAt) - new Date(a.submittedAt);
        }
        
        if (a.lastActive && b.lastActive) {
            return new Date(b.lastActive) - new Date(a.lastActive);
        }
        
        return 0;
    });
    
    // Apply pagination
    const totalCandidates = candidates.length;
    const totalPages = Math.ceil(totalCandidates / limit);
    const paginatedCandidates = candidates.slice(skip, skip + limit);
    
    res.json({
        success: true,
        candidates: paginatedCandidates,
        currentPage: page,
        totalPages: totalPages,
        totalCandidates: totalCandidates,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    });
}

// REMOVE: You can delete the separate examCandidatesData function
// since it's now integrated into the main examCandidates function