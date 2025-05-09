// // controllers/examController.js
// const Exam = require("../models/Exam");
// const User = require("./../models/usermodel");
// const { v4: uuidv4 } = require("uuid");
// const passport = require("passport");
// const moment = require("moment-timezone");
// function ensureAdmin(req, res, next) {
//     if (req.isAuthenticated() && req.user.role === "admin") {
//         return next();
//     }
//     res.status(401).send("Unauthorized: Admin access only.");
// }

// function ensureTeacher(req, res, next) {
//     if (req.isAuthenticated() && req.user.role === "teacher") {
//         return next();
//     }
//     res.status(401).send("Unauthorized: Teacher access only.");
// }

// exports.getExam = async (req, res) => {
//     if (req.isAuthenticated()) {
//         console.log("authenticated");
//         const Userprofile = await User.findById({ _id: req.user.id });
//         if (Userprofile.usertype === "admin" || Userprofile.usertype === "teacher") {
//             res.render("create_exam", { pic: Userprofile.imageurl, logged_in: "true" });
//         } else {
//             res.redirect("/admin/login");
//         }
//     } else {
//         res.redirect("/admin/login");
//     }
// };

// exports.createExam = async (req, res) => {
//     try {
//         let { name, departments, semester, questionType, numMCQs, numCoding, numTotalQuestions, scheduledAt, Duration, scheduleTill , draft } = req.body;
//         console.log(req.body);
//         if(!scheduleTill || !scheduledAt){
//             console.log("what the fuck")
//             const newExamss = new Exam({
//                 name,
//                 departments: Array.isArray(departments) ? departments : [departments], 
//                 semester,
//                 questionType,
//                 duration: Duration,
//                 numMCQs: parseInt(numMCQs) || 0,
//                 numCoding: parseInt(numCoding) || 0,
//                 numTotalQuestions: parseInt(numTotalQuestions) || 0,
//                 createdBy: req.user.id,
//                 testStatus:"draft"

//             });
//             await newExamss.save();
//             res.redirect("/admin");
//         }
        
//         else if(draft){
//             const newExams = new Exam({
//                 name,
//                 departments: Array.isArray(departments) ? departments : [departments], 
//                 semester,
//                 questionType,
//                 duration: Duration,
//                 numMCQs: parseInt(numMCQs) || 0,
//                 numCoding: parseInt(numCoding) || 0,
//                 numTotalQuestions: parseInt(numTotalQuestions) || 0,
//                 createdBy: req.user.id,
//                 testStatus:"draft"
//             });
//             await newExams.save();
//             res.redirect("/admin");
//         }
//         else{

    
//         try{
//             scheduledAt = moment.tz(scheduledAt, "Asia/Kolkata").toDate();
//             scheduleTill = moment.tz(scheduleTill, "Asia/Kolkata").toDate();
//         }catch(err){
//             console.error("what an errror")
//         }
//         const newExam = new Exam({
//             name,
//             departments: Array.isArray(departments) ? departments : [departments], 
//             semester,
//             questionType,
//             scheduledAt,
//             scheduleTill,
//             duration: Duration,
//             numMCQs: parseInt(numMCQs) || 0,
//             numCoding: parseInt(numCoding) || 0,
//             numTotalQuestions: parseInt(numTotalQuestions) || 0,
//             createdBy: req.user.id,
//         });

//         await newExam.save();
//         res.redirect("/admin");
//     }
//     } catch (error) {
//         res.status(400).send(error.message);
//     }
// };

// exports.getEditExam = async (req, res) => {
//     if (req.isAuthenticated()) {
//         console.log("authenticated");
//         const Userprofile = await User.findById({ _id: req.user.id });
//         if (Userprofile.usertype === "admin" || Userprofile.usertype === "teacher") {
//             try {
//                 const exam = await Exam.findById(req.params.examId);
//                 if (!exam) return res.status(404).send("Exam not found.");
//                 res.render("edit_exam", { pic: Userprofile.imageurl, logged_in: "true", exam });
//             } catch (error) {
//                 console.error(error);
//                 res.status(500).send("Server error");
//             }
//         } else {
//             res.redirect("/admin/login");
//         }
//     } else {
//         res.redirect("/admin/login");
//     }
// };

// exports.postEditExam = async (req, res) => {
//     try {
//         let { name, departments, semester, questionType, numMCQs, numCoding, numTotalQuestions, scheduledAt, scheduleTill, duration } = req.body;
        
//         scheduledAt = moment.tz(scheduledAt, "Asia/Kolkata").toDate();
//         scheduleTill = moment.tz(scheduleTill, "Asia/Kolkata").toDate();
        
//         const updatedExam = await Exam.findByIdAndUpdate(
//             req.params.examId,
//             {
//                 name,
//                 departments: Array.isArray(departments) ? departments : [departments],
//                 semester,
//                 questionType,
//                 numMCQs: questionType.includes("mcq") ? parseInt(numMCQs) || 0 : 0,
//                 numCoding: questionType.includes("coding") ? parseInt(numCoding) || 0 : 0,
//                 numTotalQuestions: questionType === "mcq&coding" ? (parseInt(numMCQs) || 0) + (parseInt(numCoding) || 0) : 0,
//                 scheduledAt,
//                 scheduleTill,
//                 duration: parseInt(duration) || 60
//             },
//             { new: true }
//         );

//         if (!updatedExam) return res.status(404).send("Exam not found.");

//         res.redirect("/admin");
//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Server error");
//     }
// };

// exports.deleteExam = async (req, res) => {
//     try {
//         const deletedExam = await Exam.findByIdAndDelete(req.params.examId);
//         if (!deletedExam) return res.status(404).send("Exam not found.");
//         res.redirect("/admin");
//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Server error");
//     }
// };
// controllers/examController.js
const Exam = require("../models/Exam");
const ExamCandidate = require('../models/ExamCandidate');
const User = require("./../models/usermodel");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const moment = require("moment-timezone");
const { scheduleExamReminder, cancelExamReminder } = require("../utils/examreminder");

function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === "admin") {
        return next();
    }
    res.status(401).send("Unauthorized: Admin access only.");
}

function ensureTeacher(req, res, next) {
    if (req.isAuthenticated() && req.user.role === "teacher") {
        return next();
    }
    res.status(401).send("Unauthorized: Teacher access only.");
}

exports.getExam = async (req, res) => {
    if (req.isAuthenticated()) {
        console.log("authenticated");
        const Userprofile = await User.findById({ _id: req.user.id });
        if (Userprofile.usertype === "admin" || Userprofile.usertype === "teacher") {
            res.render("create_exam", { pic: Userprofile.imageurl, logged_in: "true" });
        } else {
            res.redirect("/admin/login");
        }
    } else {
        res.redirect("/admin/login");
    }
};



exports.searchStudent = async (req, res) => {
    try {
      const { usn } = req.query;
      
      const student = await User.findOne({ USN : usn });
      
      if (student) {
        return res.json({
          success: true,
          student: {
            usn: student.USN,
            name: student.name,
            department: student.Department,
            semester: student.Semester,
            _id: student._id
          }
        });
      } else {
        return res.json({
          success: false,
          message: 'Student not found'
        });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };








exports.createExam = async (req, res) => {
    try {
        let { name, departments, semester, questionType, numMCQs, numCoding, numTotalQuestions, scheduledAt, Duration, scheduleTill,additionalCandidates, draft } = req.body;
        if(!scheduleTill || !scheduledAt){
            console.log("what the fuck")
            const newExamss = new Exam({
                name,
                departments: Array.isArray(departments) ? departments : [departments], 
                semester,
                questionType,
                duration: Duration,
                numMCQs: parseInt(numMCQs) || 0,
                numCoding: parseInt(numCoding) || 0,
                numTotalQuestions: parseInt(numTotalQuestions) || 0,
                createdBy: req.user.id,
                testStatus:"draft"

            });
            await newExamss.save();
            res.redirect("/admin");
        }
        
        let newExam;
        
        if(!scheduleTill || !scheduledAt || draft){
            console.log("Creating draft exam");
            newExam = new Exam({
                name,
                departments: Array.isArray(departments) ? departments : [departments], 
                semester,
                questionType,
                duration: Duration,
                numMCQs: parseInt(numMCQs) || 0,
                numCoding: parseInt(numCoding) || 0,
                numTotalQuestions: parseInt(numTotalQuestions) || 0,
                createdBy: req.user.id,
                testStatus: "draft"
            });
            await newExam.save();
        } else {
            try {
                scheduledAt = moment.tz(scheduledAt, "Asia/Kolkata").toDate();
                scheduleTill = moment.tz(scheduleTill, "Asia/Kolkata").toDate();
            } catch(err) {
                console.error("Error converting dates:", err);
            }
            
            newExam = new Exam({
                name,
                departments: Array.isArray(departments) ? departments : [departments], 
                semester,
                questionType,
                scheduledAt,
                scheduleTill,
                duration: Duration,
                numMCQs: parseInt(numMCQs) || 0,
                numCoding: parseInt(numCoding) || 0,
                numTotalQuestions: parseInt(numTotalQuestions) || 0,
                createdBy: req.user.id,
            });

            await newExam.save();
            
            // Schedule reminder email for this exam
            if (!draft) {
                await scheduleExamReminder(newExam);
                console.log(`Reminder scheduled for exam: ${newExam.name}`);
            }
        }

        const exam = await newExam.save();
         // Process additional candidates if any
        if (additionalCandidates) {
        const candidates = JSON.parse(additionalCandidates);
        
        if (candidates.length > 0) {
          const candidatesData = candidates.map(candidate => ({
            exam: exam._id,
            usn: candidate.usn,
            isAdditional: true
        }));
          
          await ExamCandidate.insertMany(candidatesData);
        }
        }
        req.flash('success', draft ? 'Exam saved as draft successfully' : 'Exam created successfully');
        res.redirect("/admin");
    } catch (error) {
        console.error("Error creating exam:", error);
        res.status(400).send(error.message);
    }
};




// Get eligible students for an exam
exports.getEligibleStudents = async (req, res) => {
    try {
      const { examId } = req.params;
      
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({
          success: false,
          message: 'Exam not found'
        });
      }
      
      // Get students from eligible departments and semester
      const departmentStudents = await User.find({
        Department: { $in: exam.departments },
        Semester: exam.semester
      });
      
      // Get additional candidates from ExamCandidate model
      const additionalCandidates = await ExamCandidate.find({
        exam: examId,
        isAdditional: true
      });
      
      console.log("Additional candidates found:", additionalCandidates);
      
      const allStudents = [...departmentStudents];
      
      // For each additional candidate, find the student in the User model by USN
      for (const candidate of additionalCandidates) {
        // Check if the student is already included based on USN
        const isAlreadyIncluded = allStudents.some(student => 
          student.usn === candidate.usn
        );
        
        if (!isAlreadyIncluded && candidate.usn) {
          try {
            // Find the student by USN in the User model (not by ID)
            const studentData = await User.findOne({ USN: candidate.usn });
            
            if (studentData) {
              // Student found in User model, add to the list
              allStudents.push(studentData);
            } else {
              // Student not found in User model, add basic info
              allStudents.push({
                usn: candidate.usn,
                name: 'Unknown Student',
                Department: 'Additional',
                Semester: exam.semester
              });
            }
          } catch (err) {
            console.error("Error finding student by USN:", err);
            // Fall back to basic info on error
            allStudents.push({
              usn: candidate.usn,
              name: 'Unknown Student',
              Department: 'Additional',
              Semester: exam.semester
            });
          }
        }
      }
      
      return res.render("view_selected_students", {
        students: allStudents
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };





exports.getEditExam = async (req, res) => {
    if (req.isAuthenticated()) {
        console.log("authenticated");
        const Userprofile = await User.findById({ _id: req.user.id });
        if (Userprofile.usertype === "admin" || Userprofile.usertype === "teacher") {
            try {
                const exam = await Exam.findById(req.params.examId);
                if (!exam) return res.status(404).send("Exam not found.");
                res.render("edit_exam", { pic: Userprofile.imageurl, logged_in: "true", exam });
            } catch (error) {
                console.error(error);
                res.status(500).send("Server error");
            }
        } else {
            res.redirect("/admin/login");
        }
    } else {
        res.redirect("/admin/login");
    }
};

exports.postEditExam = async (req, res) => {
    try {
        let { name, departments, semester, questionType, numMCQs, numCoding, numTotalQuestions, scheduledAt, scheduleTill, duration } = req.body;
        
        if (scheduledAt) {
            scheduledAt = moment.tz(scheduledAt, "Asia/Kolkata").toDate();
        }
        
        if (scheduleTill) {
            scheduleTill = moment.tz(scheduleTill, "Asia/Kolkata").toDate();
        }
        
        const updatedExam = await Exam.findByIdAndUpdate(
            req.params.examId,
            {
                name,
                departments: Array.isArray(departments) ? departments : [departments],
                semester,
                questionType,
                numMCQs: questionType.includes("mcq") ? parseInt(numMCQs) || 0 : 0,
                numCoding: questionType.includes("coding") ? parseInt(numCoding) || 0 : 0,
                numTotalQuestions: questionType === "mcq&coding" ? (parseInt(numMCQs) || 0) + (parseInt(numCoding) || 0) : 0,
                scheduledAt,
                scheduleTill,
                duration: parseInt(duration) || 60
            },
            { new: true }
        );

        if (!updatedExam) return res.status(404).send("Exam not found.");

        // Update the reminder schedule
        if (updatedExam.testStatus !== 'draft') {
            await scheduleExamReminder(updatedExam);
            console.log(`Reminder rescheduled for exam: ${updatedExam.name}`);
        }

        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};

exports.deleteExam = async (req, res) => {
    try {
        // Cancel any scheduled reminder for this exam
        cancelExamReminder(req.params.examId);
        
        const deletedExam = await Exam.findByIdAndDelete(req.params.examId);
        if (!deletedExam) return res.status(404).send("Exam not found.");
        
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};