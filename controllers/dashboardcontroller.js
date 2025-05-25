const User = require("./../models/usermodel");
const Exam = require("../models/Exam");
const Submission = require("./../models/SubmissionSchema");
const { redirect } = require("express/lib/response");
const MCQQuestion = require("./../models/MCQQuestion")

exports.getcontrol = async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const student = await User.findById(req.user._id);
            if (student.usertype != "student") {
                res.redirect("/admin")
            } else {
                if (!student) return res.status(404).json({ error: "Student not found" });

                const currentTime = new Date();
                
                // Find ALL exams that match the student's semester and department
                const exams = await Exam.find({
                    semester: student.Semester,
                    departments: student.Department
                });

                // Fetch submissions with exam details
                const submissions = await Submission.find({ student: req.user._id })
                    .populate('exam')
                    .exec();

                // Create a map of exam ID to submission data
                const submissionMap = {};
                submissions.forEach(submission => {
                    // Check if exam exists and is not null before accessing its _id
                    if (submission.exam && submission.exam._id) {
                        submissionMap[submission.exam._id.toString()] = {
                            submittedAt: submission.submittedAt,
                            score: submission.score,
                            submissionId: submission._id
                        };
                    } else {
                        // Log the problematic submission for debugging
                        console.warn('Found submission with null or missing exam:', {
                            submissionId: submission._id,
                            examField: submission.exam,
                            studentId: submission.student
                        });
                    }
                });

                // Add status properties to each exam
                const examsWithStatus = exams.map(exam => {
                    const examObj = exam.toObject();
                    const submission = submissionMap[exam._id.toString()];
                    
                    return {
                        ...examObj,
                        alreadyGiven: !!submission,
                        isExpired: new Date(exam.scheduleTill) < currentTime,
                        // Add submission data if exists
                        submissionData: submission || null
                    };
                });

                console.log(examsWithStatus);

                const Userprofile = await User.findById(req.user.id);
                res.render("dashboard", {
                    pic: Userprofile.imageurl,
                    logged_in: "true",
                    exams: examsWithStatus,
                    user: req.user
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Server Error" });
        }
    } else {
        res.redirect("/");
    }
};


exports.getStartExam = async(req,res)=>{

    try {
        const currentTime = new Date();
        const examId = req.params.examId;
        const studentId = req.user._id;

        // Check if the user has already taken the exam
        const existingSubmission = await Submission.findOne({ exam: examId, student: studentId });

        if (existingSubmission) {
            return res.status(403).send("You have already taken this exam and cannot attempt it again.");
        }
        const exam = await Exam.findById(req.params.examId)
            .populate("mcqQuestions")
            .populate("codingQuestions");

        if (!exam) {
            return res.status(404).send("Exam not found");
        }
        if (currentTime < exam.scheduledAt) { // Assuming 'scheduleFrom' is the start time field
            return res.status(403).send("This exam has not started yet. Please wait until the scheduled time.");
        }
        
        // Check if the exam is still available
        if (currentTime > exam.scheduleTill) {
            return res.status(403).send("This exam is no longer available.");
        }
        console.log()
        if (exam.questionType == "coding"){
            res.render("test3", { user: req.user, exam  });
        }
       else if (exam.questionType == "mcq"){
            res.render("test3", { user: req.user, exam  });
        }else{
            res.render("test3", { user: req.user, exam  });
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }


}

exports.postStartExam = async (req, res) => {
  try {
    const { exam: examId, mcqAnswers, codingAnswers } = req.body;
    console.log(examId)
      const studentId = req.user._id;
    console.log(studentId)
    // Validate exam ID
    if (!examId) {
      return res.status(400).json({ error: 'Exam ID is required' });
    }
    
    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Get student ID from session
  
    if (!studentId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Create new submission
    const newSubmission = new Submission({
      exam: examId,
      student: studentId,
      mcqAnswers: mcqAnswers || [],
      codingAnswers: codingAnswers || [],
      submittedAt: new Date()
    });
    
    // Calculate score (if exam has automatic grading enabled)
    if (exam.autoGrade) {
      let totalScore = 0;
      
      // Grade MCQ questions
      if (mcqAnswers && mcqAnswers.length > 0) {
        for (const answer of mcqAnswers) {
          const question = await MCQQuestion.findById(answer.questionId);
          if (question && question.correctOption === parseInt(answer.selectedOption)) {
            totalScore += question.marks || 1;
          }
        }
      }
      
      // For coding questions, you might need a more complex grading system
      // This is a simplified example
      
      newSubmission.score = totalScore;
    }
    
    // Save the submission
    await newSubmission.save();
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      redirectUrl: '/dashboard'
    });
    
  } catch (error) {
    console.error('Error in exam submission:', error);
    return res.status(500).json({ error: 'Server error during submission' });
  }
};


















