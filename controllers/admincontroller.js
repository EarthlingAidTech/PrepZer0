const Exam = require("../models/Exam");
const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const { v4: uuidv4 } = require('uuid');
const passport =  require('passport');
const Submission = require('../models/SubmissionSchema');
const ActivityTracker = require('../models/ActiveSession');



exports.getcontrol = async(req,res)=>{
    if(req.isAuthenticated()){
        console.log("authenticated")
        const Userprofile = await User.findById({_id : req.user.id})

        if(Userprofile.usertype == "admin" || Userprofile.usertype == "teacher"){
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
        if(req.body.role == "admin" || req.body.role == "teacher" ){
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

          
           badhttp = "https://prepzer0.co.in/authenticate/verify/"+randurl
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

        await  User.register({email : req.body.email,randomurl : randurl ,usertype : req.body.role, Department : req.body.department }, req.body.password,(err,user)=>{
            if(err){   
                console.log(err)
                res.render('signup',{errormsg : "email already taken"})
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



// exports.allStudents = async(req, res) => {
//     try {
//         // Query the database for all users with usertype "student"
//         const students = await User.find({ usertype: "student" })
//             .select('-password -passwordresettoken -passwordresetdate') // Exclude sensitive fields
//             .sort({ created: -1 }); // Sort by creation date, newest first
        
//         // Render the EJS template with the students data
//         res.render('allstudentsprofile', { 
//             students: students,
//             title: 'All Students', 
//             heading: 'Student Profiles'
//         });
//     } catch (error) {
//         console.error('Error fetching students:', error);
//         res.status(500).render('error', { 
//             message: 'Failed to load student profiles',
//             error: error
//         });
//     }
// };

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






    // exports.examCandidates = async(req, res) => {
    //     try {
    //         const examId = req.params.examId;
            
    //         // Fetch the exam details
    //         const exam = await Exam.findById(examId);
            
    //         if (!exam) {
    //             return res.status(404).render('error', { 
    //                 message: 'Exam not found',
    //                 error: { status: 404, stack: '' } 
    //             });
    //         }
            
    //         // Fetch all submissions related to this exam
    //         const submissions = await Submission.find({ exam: examId })
    //             .populate('student', 'USN email Department Semester Rollno') // Adjust fields as needed based on your User model
    //             .sort({ submittedAt: -1 }); // Most recent submissions first
            
    //         // Create a list of unique students (in case of multiple submissions)
    //         const studentMap = new Map();
    //         submissions.forEach(submission => {
    //             if (!studentMap.has(submission.student._id.toString())) {
    //                 studentMap.set(submission.student._id.toString(), {
    //                     student: submission.student,
    //                     submission: submission,
    //                     score: submission.score || 'N/A',
    //                     submittedAt: submission.submittedAt
    //                 });
    //             }
    //         });
            
    //         const candidates = Array.from(studentMap.values());
            
    //         // Render the candidates view
    //         res.render('exam_candidates', {
    //             title: `Candidates for ${exam.name}`,
    //             exam: exam,
    //             candidates: candidates
    //         });
            
    //     } catch (error) {
    //         console.error('Error fetching exam candidates:', error);
    //         res.status(500).render('error', { 
    //             message: 'Error fetching exam candidates',
    //             error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' } 
    //         });
    //     }
    // }






























// exports.getExam = async (req, res) => {
//     res.render('create_exam');
// }

// exports.createExam = async (req, res) => {
    
//     try {
//         const { department, semester, questionType, numMCQs, numCoding, duration, scheduledAt } = req.body;

     
//         const mcqs = await Question.find({
//             department,
//             semester,
//             type: "mcq"
//         }).limit(numMCQs);

//         const codingQuestions = await Question.find({
//             department,
//             semester,
//             type: "coding"
//         }).limit(numCoding);

//         // Create new exam entry
//         const newExam = new Exam({
//             name: `${department} ${semester} Placement Exam`,
//             department,
//             semester,
//             questionType,
//             numMCQs,
//             numCoding,
//             questions: [...mcqs, ...codingQuestions],
//             duration,
//             scheduledAt,
//             // createdBy: req.user.id  // Assuming req.user is populated with the logged-in user
//         });

//         // Save the exam to the database
//         await newExam.save();
//         // res.render('exam');
//         res.status(201).json({
//             message: "Exam created successfully",
//             exam: newExam
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Server error" });
//     }
// };


exports.examCandidates = async(req, res) => {
    try {
        const examId = req.params.examId;
        
        // Fetch the exam details
        const exam = await Exam.findById(examId);
        
        if (!exam) {
            return res.status(404).render('error', { 
                message: 'Exam not found',
                error: { status: 404, stack: '' } 
            });
        }
        
        // Fetch all submissions related to this exam
        const submissions = await Submission.find({ exam: examId })
            .populate('student', 'USN email Department Semester Rollno _id') 
            .sort({ submittedAt: -1 }); // Most recent submissions first
        
        // Fetch active sessions for this exam
        const activeSessions = await ActivityTracker.find({ examId: examId })
            .populate('userId', 'USN email Department Semester Rollno _id')
            .select('userId status lastPingTimestamp')
            .sort({ lastPingTimestamp: -1 });
        
        // Convert active sessions to a map for easy lookup
        const activeSessionsMap = new Map();
        activeSessions.forEach(session => {
            // Skip if userId is not properly populated
            if (!session.userId || !session.userId._id) return;
            
            const userId = session.userId._id.toString();
            activeSessionsMap.set(userId, {
                status: session.status,
                lastPing: session.lastPingTimestamp,
                studentInfo: session.userId
            });
        });
        
        // Create a set of student IDs who have submitted
        const submittedStudentIds = new Set();
        submissions.forEach(submission => {
            if (submission.student && submission.student._id) {
                submittedStudentIds.add(submission.student._id.toString());
            }
        });
        
        // First, process all submissions
        const studentMap = new Map();
        submissions.forEach(submission => {
            if (submission.student && submission.student._id && !studentMap.has(submission.student._id.toString())) {
                const studentId = submission.student._id.toString();
                const activeSession = activeSessionsMap.get(studentId);
                
                studentMap.set(studentId, {
                    student: submission.student,
                    submission: submission,
                    score: submission.score || 'N/A',
                    submittedAt: submission.submittedAt,
                    activityStatus: activeSession ? activeSession.status : 'offline',
                    lastActive: activeSession ? activeSession.lastPing : null,
                    hasSubmitted: true
                });
                
                // Remove from active sessions map to avoid duplicates
                activeSessionsMap.delete(studentId);
            }
        });
        
        // Then, process active sessions of students who haven't submitted
        activeSessionsMap.forEach((session, studentId) => {
            if (!submittedStudentIds.has(studentId)) {
                studentMap.set(studentId, {
                    student: session.studentInfo,
                    submission: null,
                    score: 'In progress',
                    submittedAt: null,
                    activityStatus: session.status,
                    lastActive: session.lastPing,
                    hasSubmitted: false
                });
            }
        });
        
        const candidates = Array.from(studentMap.values());
        
        // Sort candidates: active students first, then by submission status and time
        candidates.sort((a, b) => {
            // First prioritize active status
            if (a.activityStatus === 'active' && b.activityStatus !== 'active') return -1;
            if (a.activityStatus !== 'active' && b.activityStatus === 'active') return 1;
            
            // Then by submission status (submitted after non-submitted)
            if (a.hasSubmitted && !b.hasSubmitted) return -1;
            if (!a.hasSubmitted && b.hasSubmitted) return 1;
            
            // Then by submission time (most recent first)
            if (a.submittedAt && b.submittedAt) {
                return new Date(b.submittedAt) - new Date(a.submittedAt);
            }
            
            // Finally by last active time
            if (a.lastActive && b.lastActive) {
                return new Date(b.lastActive) - new Date(a.lastActive);
            }
            
            return 0;
        });
        
        // Render the candidates view
        res.render('exam_candidates', {
            title: `Candidates for ${exam.name}`,
            exam: exam,
            candidates: candidates
        });
        
    } catch (error) {
        console.error('Error fetching exam candidates:', error);
        res.status(500).render('error', { 
            message: 'Error fetching exam candidates',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' } 
        });
    }
}
