const Exam = require("../models/Exam");
const Submission = require("../models/SubmissionSchema");
const ActivityTracker = require("../models/ActiveSession");
const ReportModel = require('../models/reportModel');
const ExamCandidate = require('../models/ExamCandidate');
const User = require("./../models/usermodel");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const moment = require("moment-timezone");
const { scheduleExamReminder, cancelExamReminder } = require("../utils/examreminder");
const activityTracker = require("../models/ActiveSession");
const EvaluationResult = require("../models/EvaluationResultSchema");
const MCQ = require("../models/MCQQuestion");

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
        let { name, departments, semester, questionType, numMCQs, numCoding, numTotalQuestions, scheduledAt, Duration, scheduleTill,additionalCandidates, draft ,  settings  } = req.body;
            const examSettings = {
            camera: settings?.camera === 'true',
            phone: settings?.phone === 'true', 
            showResults: settings?.showResults === 'true'
        };
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
                testStatus:"draft" ,
                settings: examSettings 

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
                testStatus: "draft",
                settings: examSettings 
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
                settings: examSettings 
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







// exports.exportExamReport = async (req, res) => {
//     try {
//         const examId = req.params.examId;
        
//         // Fetch the exam details
//         const exam = await Exam.findById(examId);
        
//         if (!exam) {
//             return res.status(404).send('Exam not found');
//         }
        
//         // Fetch all submissions related to this exam
//         const submissions = await Submission.find({ exam: examId })
//             .populate('student', 'USN fname email Department Semester Rollno _id')
//             .sort({ submittedAt: -1 });
        
//         // Fetch active sessions for this exam
//         const activeSessions = await ActivityTracker.find({ examId: examId })
//             .populate('userId', 'USN name email Department Semester Rollno _id')
//             .select('userId status lastPingTimestamp startTimestamp');
        
//         // Create a map of active sessions for lookup
//         const activeSessionsMap = new Map();
//         activeSessions.forEach(session => {
//             if (session.userId && session.userId._id) {
//                 activeSessionsMap.set(session.userId._id.toString(), {
//                     status: session.status,
//                     startedAt: session.startTimestamp || null
//                 });
//             }
//         });
        
//         // Prepare data for the spreadsheet
//         const reportData = [];
//         let serialNumber = 1;
        
//         // Process each submission
//         for (const submission of submissions) {
//             if (submission.student && submission.student._id) {
//                 try {
//                     // Get detailed report data if available
//                     let detailedReport = null;
//                     try {
//                         detailedReport = await ReportModel.getAssessmentReport(submission._id);
//                     } catch (reportError) {
//                         console.log(`Could not fetch detailed report for submission ${submission._id}: ${reportError.message}`);
//                         // Continue with basic data if detailed report fails
//                     }
                    
//                     const studentId = submission.student._id.toString();
//                     const sessionInfo = activeSessionsMap.get(studentId) || {};
                    
//                     // Determine the student name - handle different student schema formats
//                     let studentName = 'N/A';
//                     if (submission.student.name) {
//                         studentName = submission.student.name;
//                     } else if (submission.student.fname && submission.student.lname) {
//                         studentName = `${submission.student.fname} ${submission.student.lname}`;
//                     }
                    
//                     // Calculate maximum possible score and obtained score
//                     let maxScore = 100; // Default fallback
//                     let obtainedScore = submission.score;
                    
//                     // Use detailed report data if available
//                     if (detailedReport && detailedReport.score) {
//                         maxScore = detailedReport.score.total;
//                         obtainedScore = detailedReport.score.obtained;
//                     } else {
//                         // Fallback to exam total marks or calculate from submission
//                         maxScore = exam.totalMarks || 
//                             (submission.mcqAnswers?.length + (submission.codingAnswers?.length || 0)) * 10 || 
//                             100;
//                     }
                    
//                     // Calculate percentage
//                     const percentage = obtainedScore !== undefined && maxScore > 0 ? 
//                         ((obtainedScore / maxScore) * 100).toFixed(2) + '%' : 'N/A';
                    
//                     // Get integrity score - either from detailed report or submission
//                     let integrityScore = submission.integrityScore || 'N/A';
//                     if (detailedReport && detailedReport.integrity) {
//                         integrityScore = detailedReport.integrity.status || integrityScore``;
//                     }
                    

//                     let st = await activityTracker.findOne(
//                                 { examId: examId, userId: submission.student._id }
//                             ).select('startedAt -_id');
//                     // Get time information
//                     let startedAt = st.startedAt ? 
//                         new Date(st.startedAt).toLocaleString() : 'N/A';
//                     let submittedAt = submission.submittedAt ? 
//                         new Date(submission.submittedAt).toLocaleString() : 'N/A';
                    
//                     // Use detailed report time data if available
//                     if (detailedReport && detailedReport.timeAnalysis) {
//                         // if (detailedReport.timeAnalysis.startTime) {
//                         //     startedAt = new Date(detailedReport.timeAnalysis.startTime).toLocaleString();
//                         // }
//                         if (detailedReport.timeAnalysis.endTime) {
//                             submittedAt = new Date(detailedReport.timeAnalysis.endTime).toLocaleString();
//                         }
//                     }
//                     console.log(detailedReport.integrity.status);
                    
//                     // Add this student's data to the report
//                     reportData.push({
//                         'SN': serialNumber++,
//                         'USN': submission.student.USN || 'N/A',
//                         'Name': submission.student.fname,
//                         'Total Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
//                         'Maximum Score': maxScore,
//                         'Total Percentage': percentage,
//                         'Started At': startedAt,
//                         'Submitted At': submittedAt,
//                         'Integrity Score': integrityScore,
//                         'Copy Atempts': detailedReport.integrity.data.copyAttempts,
//                         'Focus Changes': detailedReport.integrity.data.focusChanges,
//                         'Full Screen Exits': detailedReport.integrity.data.fullscreenExits,
//                         'Mouse Outs': detailedReport.integrity.data.mouseOuts,
//                         'Paste Attempts': detailedReport.integrity.data.pasteAttempts,
//                         'Tab Changes': detailedReport.integrity.data.tabChanges,
//                     });
//                 } catch (submissionError) {
//                     console.error(`Error processing submission ${submission._id}:`, submissionError);
//                     // Continue with next submission
//                 }
//             }
//         }
        
//         // Create Excel workbook using ExcelJS
//         const ExcelJS = require('exceljs');
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Exam Report');
        
//         // Define columns
//         worksheet.columns = [
//             { header: 'SN', key: 'SN', width: 5 },
//             { header: 'USN', key: 'USN', width: 15 },
//             { header: 'Name', key: 'Name', width: 25 },
//             { header: 'Total Score', key: 'Total Score', width: 12 },
//             { header: 'Maximum Score', key: 'Maximum Score', width: 15 },
//             { header: 'Total Percentage', key: 'Total Percentage', width: 18 },
//             { header: 'Started At', key: 'Started At', width: 25 },
//             { header: 'Submitted At', key: 'Submitted At', width: 25 },
//             { header: 'Integrity Score', key: 'Integrity Score', width: 15 },
//             { header: 'Copy Atempts', key: 'Copy Atempts', width: 15 },
//             { header: 'Focus Changes', key: 'Focus Changes', width: 15 },
//             { header: 'Full Screen Exits', key: 'Full Screen Exits', width: 15 },
//             { header: 'Mouse Outs', key: 'Mouse Outs', width: 15 },
//             { header: 'Paste Attempts', key: 'Paste Attempts', width: 15 },
//             { header: 'Tab Changes', key: 'Tab Changes', width: 15 },
//         ];
        
//         // Add header row styling
//         worksheet.getRow(1).font = { bold: true };
//         worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
//         worksheet.getRow(1).fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: '4F46E5' } // Primary color from your theme
//         };
//         worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        
//         // Add data rows
//         reportData.forEach(data => {
//             worksheet.addRow(data);
//         });
        
//         // Apply border styling to all cells
//         worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
//             row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
//                 cell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
                
//                 // Center align numeric cells - use column number instead of header
//                 // Column numbers are 1-based in ExcelJS
//                 if ([1, 4, 5, 9].includes(colNumber)) { // SN, Total Score, Maximum Score, Integrity Score
//                     cell.alignment = { horizontal: 'center' };
//                 }
//             });
//         });
        
//         // Set filename
//         const filename = `${exam.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report_${Date.now()}.xlsx`;
        
//         // Set response headers
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
//         // Write to response stream
//         await workbook.xlsx.write(res);
//         res.end();
        
//     } catch (error) {
//         console.error('Error generating exam report:', error);
//         res.status(500).send('Error generating report: ' + error.message);
//     }
// };



















// exports.exportExamReport = async (req, res) => {
//     try {
//         const examId = req.params.examId;
        
//         // Fetch the exam details
//         const exam = await Exam.findById(examId);
        
//         if (!exam) {
//             return res.status(404).send('Exam not found');
//         }
        
//         // Use Promise.all to fetch data in parallel instead of sequentially
//         const [submissions, activeSessions, activityTrackers] = await Promise.all([
//             // Fetch submissions with only required fields to reduce memory usage
//             Submission.find({ exam: examId })
//                 .populate('student', 'USN fname lname name email Department Semester Rollno _id')
//                 .select('student score submittedAt mcqAnswers codingAnswers integrityScore _id')
//                 .lean(), // Use lean() for better performance
            
//             // Fetch active sessions
//             ActivityTracker.find({ examId: examId })
//                 .populate('userId', 'USN name email Department Semester Rollno _id')
//                 .select('userId status lastPingTimestamp startTimestamp')
//                 .lean(),
            
//             // Fetch all activity trackers for start times in one query
//             activityTracker.find({ examId: examId })
//                 .select('userId startedAt -_id')
//                 .lean()
//         ]);
        
//         // Create maps for O(1) lookups instead of repeated database queries
//         const activeSessionsMap = new Map();
//         activeSessions.forEach(session => {
//             if (session.userId && session.userId._id) {
//                 activeSessionsMap.set(session.userId._id.toString(), {
//                     status: session.status,
//                     startedAt: session.startTimestamp || null
//                 });
//             }
//         });
        
//         const activityTrackersMap = new Map();
//         activityTrackers.forEach(tracker => {
//             if (tracker.userId) {
//                 activityTrackersMap.set(tracker.userId.toString(), tracker.startedAt);
//             }
//         });
        
//         // Batch fetch all detailed reports at once instead of one by one
//         const submissionIds = submissions.map(s => s._id);
//         let detailedReports = new Map();
        
//         try {
//             // If ReportModel supports batch operations, use it
//             const reports = await ReportModel.find({ submissionId: { $in: submissionIds } }).lean();
//             reports.forEach(report => {
//                 detailedReports.set(report.submissionId.toString(), report);
//             });
//         } catch (batchError) {
//             console.log('Batch report fetch failed, falling back to individual queries');
//             // Fallback: fetch reports in smaller batches to avoid overwhelming the system
//             const batchSize = 50;
//             for (let i = 0; i < submissionIds.length; i += batchSize) {
//                 const batch = submissionIds.slice(i, i + batchSize);
//                 try {
//                     const batchReports = await Promise.all(
//                         batch.map(async (id) => {
//                             try {
//                                 const report = await ReportModel.getAssessmentReport(id);
//                                 return { id, report };
//                             } catch (error) {
//                                 return { id, report: null };
//                             }
//                         })
//                     );
                    
//                     batchReports.forEach(({ id, report }) => {
//                         if (report) {
//                             detailedReports.set(id.toString(), report);
//                         }
//                     });
//                 } catch (error) {
//                     console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
//                 }
//             }
//         }
        
//         // Pre-calculate common values
//         const defaultMaxScore = exam.totalMarks || 100;
        
//         // Process data more efficiently and collect rank information
//         const reportData = [];
//         const submissionsWithRanks = [];
        
//         // First pass: collect all submission data with ranks
//         for (const submission of submissions) {
//             if (!submission.student || !submission.student._id) continue;
            
//             try {
//                 const detailedReport = detailedReports.get(submission._id.toString());
                
//                 // Get rank from detailed report
//                 const rank = detailedReport && detailedReport.ranking ? 
//                     detailedReport.ranking.rank : null;
                
//                 submissionsWithRanks.push({
//                     submission,
//                     detailedReport,
//                     rank
//                 });
//             } catch (error) {
//                 console.error(`Error processing submission ${submission._id}:`, error);
//                 continue;
//             }
//         }
        
//         // Sort by rank (lowest rank number first, nulls last)
//         submissionsWithRanks.sort((a, b) => {
//             if (a.rank === null && b.rank === null) return 0;
//             if (a.rank === null) return 1;
//             if (b.rank === null) return -1;
//             return a.rank - b.rank;
//         });
        
//         // Second pass: create report data in rank order
//         let serialNumber = 1;
        
//         for (const { submission, detailedReport } of submissionsWithRanks) {
//             try {
//                 const studentId = submission.student._id.toString();
//                 const sessionInfo = activeSessionsMap.get(studentId) || {};
                
//                 // Determine student name efficiently
//                 const studentName = submission.student.name || 
//                     (submission.student.fname && submission.student.lname ? 
//                         `${submission.student.fname} ${submission.student.lname}` : 
//                         submission.student.fname || 'N/A');
                
//                 // Calculate scores
//                 let maxScore = defaultMaxScore;
//                 let obtainedScore = submission.score;
                
//                 if (detailedReport && detailedReport.score) {
//                     maxScore = detailedReport.score.total;
//                     obtainedScore = detailedReport.score.obtained;
//                 } else if (!obtainedScore) {
//                     maxScore = (submission.mcqAnswers?.length || 0) + (submission.codingAnswers?.length || 0) * 10 || defaultMaxScore;
//                 }
                
//                 // Calculate percentage
//                 const percentage = obtainedScore !== undefined && maxScore > 0 ? 
//                     ((obtainedScore / maxScore) * 100).toFixed(2) + '%' : 'N/A';
                
//                 // Get integrity data
//                 let integrityScore = submission.integrityScore || 'N/A';
//                 let integrityStatus = 'Acceptable'; // Default status
//                 let integrityData = {
//                     copyAttempts: 'N/A',
//                     focusChanges: 'N/A',
//                     fullscreenExits: 'N/A',
//                     mouseOuts: 'N/A',
//                     pasteAttempts: 'N/A',
//                     tabChanges: 'N/A'
//                 };
                
//                 if (detailedReport && detailedReport.integrity) {
//                     integrityStatus = detailedReport.integrity.status || 'Acceptable';
//                     integrityScore = integrityStatus;
//                     if (detailedReport.integrity.data) {
//                         const data = detailedReport.integrity.data;
//                         integrityData = {
//                             copyAttempts: data.copyAttempts || 0,
//                             focusChanges: data.focusChanges || 0,
//                             fullscreenExits: data.fullscreenExits || 0,
//                             mouseOuts: data.mouseOuts || 0,
//                             pasteAttempts: data.pasteAttempts || 0,
//                             tabChanges: data.tabChanges || 0
//                         };
//                     }
//                 }
                
//                 // Get rank from detailed report
//                 const rank = detailedReport && detailedReport.ranking ? 
//                     detailedReport.ranking.rank : 'N/A';
                
//                 // Get time information using the pre-fetched map
//                 const startedAt = activityTrackersMap.get(studentId) ? 
//                     new Date(activityTrackersMap.get(studentId)).toLocaleString() : 'N/A';
                
//                 let submittedAt = submission.submittedAt ? 
//                     new Date(submission.submittedAt).toLocaleString() : 'N/A';
                
//                 if (detailedReport && detailedReport.timeAnalysis && detailedReport.timeAnalysis.endTime) {
//                     submittedAt = new Date(detailedReport.timeAnalysis.endTime).toLocaleString();
//                 }
                
//                 // Add to report data
//                 reportData.push({
//                     'SN': serialNumber++,
//                     'USN': submission.student.USN || 'N/A',
//                     'Name': submission.student.fname || studentName,
//                     'Total Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
//                     'Maximum Score': maxScore,
//                     'Total Percentage': percentage,
//                     'Started At': startedAt,
//                     'Submitted At': submittedAt,
//                     'Integrity Score': integrityScore,
//                     'Copy Attempts': integrityData.copyAttempts,
//                     'Focus Changes': integrityData.focusChanges,
//                     'Full Screen Exits': integrityData.fullscreenExits,
//                     'Mouse Outs': integrityData.mouseOuts,
//                     'Paste Attempts': integrityData.pasteAttempts,
//                     'Tab Changes': integrityData.tabChanges,
//                     'Rank': rank,
//                     'IntegrityStatus': integrityStatus // Store for styling
//                 });
//             } catch (submissionError) {
//                 console.error(`Error processing submission ${submission._id}:`, submissionError);
//                 continue;
//             }
//         }
        
//         // Create Excel workbook efficiently
//         const ExcelJS = require('exceljs');
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Exam Report');
        
//         // Define columns
//         const columns = [
//             { header: 'SN', key: 'SN', width: 5 },
//             { header: 'USN', key: 'USN', width: 15 },
//             { header: 'Name', key: 'Name', width: 25 },
//             { header: 'Total Score', key: 'Total Score', width: 12 },
//             { header: 'Maximum Score', key: 'Maximum Score', width: 15 },
//             { header: 'Total Percentage', key: 'Total Percentage', width: 18 },
//             { header: 'Started At', key: 'Started At', width: 25 },
//             { header: 'Submitted At', key: 'Submitted At', width: 25 },
//             { header: 'Integrity Score', key: 'Integrity Score', width: 15 },
//             { header: 'Copy Attempts', key: 'Copy Attempts', width: 15 },
//             { header: 'Focus Changes', key: 'Focus Changes', width: 15 },
//             { header: 'Full Screen Exits', key: 'Full Screen Exits', width: 18 },
//             { header: 'Mouse Outs', key: 'Mouse Outs', width: 15 },
//             { header: 'Paste Attempts', key: 'Paste Attempts', width: 15 },
//             { header: 'Tab Changes', key: 'Tab Changes', width: 15 },
//             { header: 'Rank', key: 'Rank', width: 8 },
//         ];
        
//         worksheet.columns = columns;
        
//         // Add data in batches for better memory management
//         const batchSize = 100;
//         for (let i = 0; i < reportData.length; i += batchSize) {
//             const batch = reportData.slice(i, i + batchSize);
//             // Remove IntegrityStatus from the data before adding to worksheet
//             const cleanBatch = batch.map(row => {
//                 const { IntegrityStatus, ...cleanRow } = row;
//                 return cleanRow;
//             });
//             worksheet.addRows(cleanBatch);
//         }
        
//         // Apply styling efficiently
//         // Header styling
//         const headerRow = worksheet.getRow(1);
//         headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
//         headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
//         headerRow.fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: '4F46E5' }
//         };
        
//         // Apply borders and alignment in batches
//         const totalRows = worksheet.rowCount;
//         for (let rowNum = 1; rowNum <= totalRows; rowNum++) {
//             const row = worksheet.getRow(rowNum);
            
//             // Check if this row should have red background (unacceptable integrity)
//             const dataRowIndex = rowNum - 2; // Subtract 2 (header row + 0-based index)
//             const isUnacceptableIntegrity = dataRowIndex >= 0 && 
//                 reportData[dataRowIndex] && 
//                 reportData[dataRowIndex].IntegrityStatus === 'Unacceptable';
            
//             row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
//                 cell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
                
//                 // Apply red background for unacceptable integrity rows (except header)
//                 if (rowNum > 1 && isUnacceptableIntegrity) {
//                     cell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFCCCB' } // Light red background
//                     };
//                 }
                
//                 // Center align numeric columns (including new Rank column)
//                 if ([1, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16].includes(colNumber)) {
//                     cell.alignment = { horizontal: 'center' };
//                 }
//             });
//         }
        
//         // Set filename
//         const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
//         const filename = `${exam.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report_${timestamp}.xlsx`;
        
//         // Set response headers
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//         res.setHeader('Cache-Control', 'no-cache');
        
//         // Write to response stream
//         await workbook.xlsx.write(res);
//         res.end();
        
//     } catch (error) {
//         console.error('Error generating exam report:', error);
//         if (!res.headersSent) {
//             res.status(500).json({ 
//                 error: 'Error generating report', 
//                 message: error.message 
//             });
//         }
//     }
// };


























// exports.exportExamReport = async (req, res) => {
//     try {
//         const examId = req.params.examId;
        
//         // Fetch the exam details
//         const exam = await Exam.findById(examId);
        
//         if (!exam) {
//             return res.status(404).send('Exam not found');
//         }
        
//         // Determine question type for column structure
//         const questionType = exam.questionType || 'mcq'; // Default to MCQ if not specified
        
//         // Use Promise.all to fetch data in parallel instead of sequentially
//         const dataQueries = [
//             // Fetch submissions with only required fields to reduce memory usage
//             Submission.find({ exam: examId })
//                 .populate('student', 'USN fname lname name email Department Semester Rollno _id')
//                 .select('student score submittedAt mcqAnswers codingAnswers integrityScore _id')
//                 .lean(), // Use lean() for better performance
            
//             // Fetch active sessions
//             ActivityTracker.find({ examId: examId })
//                 .populate('userId', 'USN name email Department Semester Rollno _id')
//                 .select('userId status lastPingTimestamp startTimestamp')
//                 .lean(),
            
//             // Fetch all activity trackers for start times in one query
//             activityTracker.find({ examId: examId })
//                 .select('userId startedAt -_id')
//                 .lean()
//         ];
        
//         // Add EvaluationResult query if exam has coding questions
//         if (questionType === 'coding' || questionType === 'mcq & coding') {
//             dataQueries.push(
//                 EvaluationResult.find({ examId: examId })
//                     .populate('userId', '_id')
//                     .select('userId totalScore maxPossibleScore submissionId')
//                     .lean()
//             );
//         }
        
//         const results = await Promise.all(dataQueries);
//         const [submissions, activeSessions, activityTrackers, evaluationResults = []] = results;
        
//         // Create maps for O(1) lookups instead of repeated database queries
//         const activeSessionsMap = new Map();
//         activeSessions.forEach(session => {
//             if (session.userId && session.userId._id) {
//                 activeSessionsMap.set(session.userId._id.toString(), {
//                     status: session.status,
//                     startedAt: session.startTimestamp || null
//                 });
//             }
//         });
        
//         const activityTrackersMap = new Map();
//         activityTrackers.forEach(tracker => {
//             if (tracker.userId) {
//                 activityTrackersMap.set(tracker.userId.toString(), tracker.startedAt);
//             }
//         });
        
//         // Create evaluation results map
//         const evaluationResultsMap = new Map();
//         evaluationResults.forEach(result => {
//             if (result.userId && result.userId._id) {
//                 evaluationResultsMap.set(result.userId._id.toString(), {
//                     totalScore: result.totalScore || 0,
//                     maxPossibleScore: result.maxPossibleScore || 0,
//                     submissionId: result.submissionId
//                 });
//             }
//         });
        
//         // Batch fetch all detailed reports at once instead of one by one
//         const submissionIds = submissions.map(s => s._id);
//         let detailedReports = new Map();
        
//         try {
//             // If ReportModel supports batch operations, use it
//             const reports = await ReportModel.find({ submissionId: { $in: submissionIds } }).lean();
//             reports.forEach(report => {
//                 detailedReports.set(report.submissionId.toString(), report);
//             });
//         } catch (batchError) {
//             console.log('Batch report fetch failed, falling back to individual queries');
//             // Fallback: fetch reports in smaller batches to avoid overwhelming the system
//             const batchSize = 50;
//             for (let i = 0; i < submissionIds.length; i += batchSize) {
//                 const batch = submissionIds.slice(i, i + batchSize);
//                 try {
//                     const batchReports = await Promise.all(
//                         batch.map(async (id) => {
//                             try {
//                                 const report = await ReportModel.getAssessmentReport(id);
//                                 return { id, report };
//                             } catch (error) {
//                                 return { id, report: null };
//                             }
//                         })
//                     );
                    
//                     batchReports.forEach(({ id, report }) => {
//                         if (report) {
//                             detailedReports.set(id.toString(), report);
//                         }
//                     });
//                 } catch (error) {
//                     console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
//                 }
//             }
//         }
        
//         // Pre-calculate common values
//         const defaultMaxScore = exam.totalMarks || 100;
        
//         // Process data more efficiently and collect rank information
//         const reportData = [];
//         const submissionsWithRanks = [];
        
//         // First pass: collect all submission data with ranks
//         for (const submission of submissions) {
//             if (!submission.student || !submission.student._id) continue;
            
//             try {
//                 const detailedReport = detailedReports.get(submission._id.toString());
                
//                 // Get rank from detailed report
//                 const rank = detailedReport && detailedReport.ranking ? 
//                     detailedReport.ranking.rank : null;
                
//                 submissionsWithRanks.push({
//                     submission,
//                     detailedReport,
//                     rank
//                 });
//             } catch (error) {
//                 console.error(`Error processing submission ${submission._id}:`, error);
//                 continue;
//             }
//         }
        
//         // Sort by rank (lowest rank number first, nulls last)
//         submissionsWithRanks.sort((a, b) => {
//             if (a.rank === null && b.rank === null) return 0;
//             if (a.rank === null) return 1;
//             if (b.rank === null) return -1;
//             return a.rank - b.rank;
//         });
        
//         // Second pass: create report data in rank order
//         let serialNumber = 1;
        
//         for (const { submission, detailedReport } of submissionsWithRanks) {
//             try {
//                 const studentId = submission.student._id.toString();
//                 const sessionInfo = activeSessionsMap.get(studentId) || {};
//                 const evaluationResult = evaluationResultsMap.get(studentId) || {};
                
//                 // Determine student name efficiently
//                 const studentName = submission.student.name || 
//                     (submission.student.fname && submission.student.lname ? 
//                         `${submission.student.fname} ${submission.student.lname}` : 
//                         submission.student.fname || 'N/A');
                
//                 // Calculate scores based on question type
//                 let maxScore = defaultMaxScore;
//                 let obtainedScore = submission.score;
//                 let mcqScore = 'N/A';
//                 let codingScore = 'N/A';
//                 let mcqMaxScore = 'N/A';
//                 let codingMaxScore = 'N/A';
                
//                 if (questionType === 'mcq') {
//                     // For MCQ only - use existing logic
//                     if (detailedReport && detailedReport.score) {
//                         maxScore = detailedReport.score.total;
//                         obtainedScore = detailedReport.score.obtained;
//                     } else if (!obtainedScore) {
//                         maxScore = (submission.mcqAnswers?.length || 0) || defaultMaxScore;
//                     }
//                 } else if (questionType === 'coding') {
//                     // For Coding only - use EvaluationResult totalScore
//                     obtainedScore = evaluationResult.totalScore || 0;
//                     maxScore = evaluationResult.maxPossibleScore || 100;
//                 } else if (questionType === 'mcq & coding') {
//                     // For Mixed type
//                     // Get MCQ score using same logic as MCQ-only
//                     if (detailedReport && detailedReport.score) {
//                         mcqScore = detailedReport.score.obtained || submission.score || 0;
//                         mcqMaxScore = detailedReport.score.total || (submission.mcqAnswers?.length || 0);
//                     } else {
//                         mcqScore = submission.score || 0;
//                         mcqMaxScore = (submission.mcqAnswers?.length || 0);
//                     }
                    
//                     // Get coding score from EvaluationResult
//                     codingScore = evaluationResult.totalScore || 0;
//                     codingMaxScore = evaluationResult.maxPossibleScore || 50;
                    
//                     // Calculate totals
//                     obtainedScore = mcqScore + codingScore;
//                     maxScore = mcqMaxScore + codingMaxScore;
//                 }
                
//                 // Calculate percentage
//                 const percentage = obtainedScore !== undefined && maxScore > 0 ? 
//                     ((obtainedScore / maxScore) * 100).toFixed(2) + '%' : 'N/A';
                
//                 // Calculate individual percentages for mixed type
//                 const mcqPercentage = questionType === 'mcq & coding' && mcqMaxScore > 0 ? 
//                     ((mcqScore / mcqMaxScore) * 100).toFixed(2) + '%' : 'N/A';
//                 const codingPercentage = questionType === 'mcq & coding' && codingMaxScore > 0 ? 
//                     ((codingScore / codingMaxScore) * 100).toFixed(2) + '%' : 'N/A';
                
//                 // Get integrity data
//                 let integrityScore = submission.integrityScore || 'N/A';
//                 let integrityStatus = 'Acceptable'; // Default status
//                 let integrityData = {
//                     copyAttempts: 'N/A',
//                     focusChanges: 'N/A',
//                     fullscreenExits: 'N/A',
//                     mouseOuts: 'N/A',
//                     pasteAttempts: 'N/A',
//                     tabChanges: 'N/A'
//                 };
                
//                 if (detailedReport && detailedReport.integrity) {
//                     integrityStatus = detailedReport.integrity.status || 'Acceptable';
//                     integrityScore = integrityStatus;
//                     if (detailedReport.integrity.data) {
//                         const data = detailedReport.integrity.data;
//                         integrityData = {
//                             copyAttempts: data.copyAttempts || 0,
//                             focusChanges: data.focusChanges || 0,
//                             fullscreenExits: data.fullscreenExits || 0,
//                             mouseOuts: data.mouseOuts || 0,
//                             pasteAttempts: data.pasteAttempts || 0,
//                             tabChanges: data.tabChanges || 0
//                         };
//                     }
//                 }
                
//                 // Get rank from detailed report
//                 const rank = detailedReport && detailedReport.ranking ? 
//                     detailedReport.ranking.rank : 'N/A';
                
//                 // Get time information using the pre-fetched map
//                 const startedAt = activityTrackersMap.get(studentId) ? 
//                     new Date(activityTrackersMap.get(studentId)).toLocaleString() : 'N/A';
                
//                 let submittedAt = submission.submittedAt ? 
//                     new Date(submission.submittedAt).toLocaleString() : 'N/A';
                
//                 if (detailedReport && detailedReport.timeAnalysis && detailedReport.timeAnalysis.endTime) {
//                     submittedAt = new Date(detailedReport.timeAnalysis.endTime).toLocaleString();
//                 }
                
//                 // Create row data based on question type
//                 const baseRowData = {
//                     'SN': serialNumber++,
//                     'USN': submission.student.USN || 'N/A',
//                     'Name': submission.student.fname || studentName,
//                     'Started At': startedAt,
//                     'Submitted At': submittedAt,
//                     'Integrity Score': integrityScore,
//                     'Copy Attempts': integrityData.copyAttempts,
//                     'Focus Changes': integrityData.focusChanges,
//                     'Full Screen Exits': integrityData.fullscreenExits,
//                     'Mouse Outs': integrityData.mouseOuts,
//                     'Paste Attempts': integrityData.pasteAttempts,
//                     'Tab Changes': integrityData.tabChanges,
//                     'Rank': rank,
//                     'IntegrityStatus': integrityStatus // Store for styling
//                 };
                
//                 // Add score columns based on question type
//                 if (questionType === 'mcq') {
//                     Object.assign(baseRowData, {
//                         'Total Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
//                         'Maximum Score': maxScore,
//                         'Total Percentage': percentage
//                     });
//                 } else if (questionType === 'coding') {
//                     Object.assign(baseRowData, {
//                         'Coding Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
//                         'Coding Max Score': maxScore,
//                         'Coding Percentage': percentage
//                     });
//                 } else if (questionType === 'mcq & coding') {
//                     Object.assign(baseRowData, {
//                         'MCQ Score': mcqScore,
//                         'MCQ Max Score': mcqMaxScore,
//                         'MCQ Percentage': mcqPercentage,
//                         'Coding Score': codingScore,
//                         'Coding Max Score': codingMaxScore,
//                         'Coding Percentage': codingPercentage,
//                         'Total Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
//                         'Total Max Score': maxScore,
//                         'Total Percentage': percentage
//                     });
//                 }
                
//                 reportData.push(baseRowData);
//             } catch (submissionError) {
//                 console.error(`Error processing submission ${submission._id}:`, submissionError);
//                 continue;
//             }
//         }
        
//         // Create Excel workbook efficiently
//         const ExcelJS = require('exceljs');
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Exam Report');
        
//         // Define columns based on question type
//         let columns = [
//             { header: 'SN', key: 'SN', width: 5 },
//             { header: 'USN', key: 'USN', width: 15 },
//             { header: 'Name', key: 'Name', width: 25 }
//         ];
        
//         // Add score columns based on question type
//         if (questionType === 'mcq') {
//             columns.push(
//                 { header: 'Total Score', key: 'Total Score', width: 12 },
//                 { header: 'Maximum Score', key: 'Maximum Score', width: 15 },
//                 { header: 'Total Percentage', key: 'Total Percentage', width: 18 }
//             );
//         } else if (questionType === 'coding') {
//             columns.push(
//                 { header: 'Coding Score', key: 'Coding Score', width: 12 },
//                 { header: 'Coding Max Score', key: 'Coding Max Score', width: 15 },
//                 { header: 'Coding Percentage', key: 'Coding Percentage', width: 18 }
//             );
//         } else if (questionType === 'mcq & coding') {
//             columns.push(
//                 { header: 'MCQ Score', key: 'MCQ Score', width: 12 },
//                 { header: 'MCQ Max Score', key: 'MCQ Max Score', width: 15 },
//                 { header: 'MCQ Percentage', key: 'MCQ Percentage', width: 15 },
//                 { header: 'Coding Score', key: 'Coding Score', width: 12 },
//                 { header: 'Coding Max Score', key: 'Coding Max Score', width: 15 },
//                 { header: 'Coding Percentage', key: 'Coding Percentage', width: 15 },
//                 { header: 'Total Score', key: 'Total Score', width: 12 },
//                 { header: 'Total Max Score', key: 'Total Max Score', width: 15 },
//                 { header: 'Total Percentage', key: 'Total Percentage', width: 18 }
//             );
//         }
        
//         // Add common columns
//         columns.push(
//             { header: 'Started At', key: 'Started At', width: 25 },
//             { header: 'Submitted At', key: 'Submitted At', width: 25 },
//             { header: 'Integrity Score', key: 'Integrity Score', width: 15 },
//             { header: 'Copy Attempts', key: 'Copy Attempts', width: 15 },
//             { header: 'Focus Changes', key: 'Focus Changes', width: 15 },
//             { header: 'Full Screen Exits', key: 'Full Screen Exits', width: 18 },
//             { header: 'Mouse Outs', key: 'Mouse Outs', width: 15 },
//             { header: 'Paste Attempts', key: 'Paste Attempts', width: 15 },
//             { header: 'Tab Changes', key: 'Tab Changes', width: 15 },
//             { header: 'Rank', key: 'Rank', width: 8 }
//         );
        
//         worksheet.columns = columns;
        
//         // Add data in batches for better memory management
//         const batchSize = 100;
//         for (let i = 0; i < reportData.length; i += batchSize) {
//             const batch = reportData.slice(i, i + batchSize);
//             // Remove IntegrityStatus from the data before adding to worksheet
//             const cleanBatch = batch.map(row => {
//                 const { IntegrityStatus, ...cleanRow } = row;
//                 return cleanRow;
//             });
//             worksheet.addRows(cleanBatch);
//         }
        
//         // Apply styling efficiently
//         // Header styling
//         const headerRow = worksheet.getRow(1);
//         headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
//         headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
//         headerRow.fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: '4F46E5' }
//         };
        
//         // Apply borders and alignment in batches
//         const totalRows = worksheet.rowCount;
//         for (let rowNum = 1; rowNum <= totalRows; rowNum++) {
//             const row = worksheet.getRow(rowNum);
            
//             // Check if this row should have red background (unacceptable integrity)
//             const dataRowIndex = rowNum - 2; // Subtract 2 (header row + 0-based index)
//             const isUnacceptableIntegrity = dataRowIndex >= 0 && 
//                 reportData[dataRowIndex] && 
//                 reportData[dataRowIndex].IntegrityStatus === 'Unacceptable';
            
//             row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
//                 cell.border = {
//                     top: { style: 'thin' },
//                     left: { style: 'thin' },
//                     bottom: { style: 'thin' },
//                     right: { style: 'thin' }
//                 };
                
//                 // Apply red background for unacceptable integrity rows (except header)
//                 if (rowNum > 1 && isUnacceptableIntegrity) {
//                     cell.fill = {
//                         type: 'pattern',
//                         pattern: 'solid',
//                         fgColor: { argb: 'FFCCCB' } // Light red background
//                     };
//                 }
                
//                 // Center align numeric columns (SN, Score columns, Integrity data columns, Rank)
//                 // This will need to be adjusted based on the actual column positions for each question type
//                 const isNumericColumn = cell.value !== null && 
//                     (typeof cell.value === 'number' || 
//                      (typeof cell.value === 'string' && cell.value.includes('%')) ||
//                      colNumber === 1 || // SN
//                      colNumber === columns.length); // Rank (last column)
                
//                 if (isNumericColumn) {
//                     cell.alignment = { horizontal: 'center' };
//                 }
//             });
//         }
        
//         // Set filename
//         const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
//         let examNameSafe = exam.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
//         const filename = `${examNameSafe}_${questionType.toLowerCase().replace(/\s+/g, '_')}_report_${timestamp}.xlsx`;
        
//         // Set response headers
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//         res.setHeader('Cache-Control', 'no-cache');
        
//         // Write to response stream
//         await workbook.xlsx.write(res);
//         res.end();
        
//     } catch (error) {
//         console.error('Error generating exam report:', error);
//         if (!res.headersSent) {
//             res.status(500).json({ 
//                 error: 'Error generating report', 
//                 message: error.message 
//             });
//         }
//     }
// };










































exports.exportExamReport = async (req, res) => {
    try {
        const examId = req.params.examId;
        
        // Fetch the exam details
        const exam = await Exam.findById(examId);
        
        if (!exam) {
            return res.status(404).send('Exam not found');
        }
        
        // Determine question type for column structure
        const questionType = exam.questionType || 'mcq'; // Default to MCQ if not specified
        
        // Use Promise.all to fetch data in parallel instead of sequentially
        const dataQueries = [
            // Fetch submissions with only required fields to reduce memory usage
            Submission.find({ exam: examId })
                .populate('student', 'USN fname lname name email Department Semester Rollno _id')
                .select('student score submittedAt mcqAnswers codingAnswers integrityScore _id')
                .lean(), // Use lean() for better performance
            
            // Fetch active sessions
            ActivityTracker.find({ examId: examId })
                .populate('userId', 'USN name email Department Semester Rollno _id')
                .select('userId status lastPingTimestamp startTimestamp')
                .lean(),
            
            // Fetch all activity trackers for start times in one query
            activityTracker.find({ examId: examId })
                .select('userId startedAt -_id')
                .lean()
        ];
        
        // Add EvaluationResult query if exam has coding questions
        if (questionType.toLowerCase() === 'coding' || questionType.toLowerCase() === 'mcq & coding') {
            dataQueries.push(
                EvaluationResult.find({ examId: examId })
                    .populate('userId', '_id')
                    .select('userId totalScore maxPossibleScore submissionId')
                    .lean()
            );
        }
        
        const results = await Promise.all(dataQueries);
        const [submissions, activeSessions, activityTrackers, evaluationResults = []] = results;
        
        // Create maps for O(1) lookups instead of repeated database queries
        const activeSessionsMap = new Map();
        activeSessions.forEach(session => {
            if (session.userId && session.userId._id) {
                activeSessionsMap.set(session.userId._id.toString(), {
                    status: session.status,
                    startedAt: session.startTimestamp || null
                });
            }
        });
        
        const activityTrackersMap = new Map();
        activityTrackers.forEach(tracker => {
            if (tracker.userId) {
                activityTrackersMap.set(tracker.userId.toString(), tracker.startedAt);
            }
        });
        
        // Create evaluation results map
        const evaluationResultsMap = new Map();
        evaluationResults.forEach(result => {
            if (result.userId && result.userId._id) {
                evaluationResultsMap.set(result.userId._id.toString(), {
                    totalScore: result.totalScore || 0,
                    maxPossibleScore: result.maxPossibleScore || 0,
                    submissionId: result.submissionId
                });
            }
        });
        
        // Generate comprehensive ranking data using the enhanced ReportModel
        let rankingData = new Map();
        
        try {
            console.log(`Generating ranking for question type: ${questionType}`);
            
            if (questionType.toLowerCase() === 'mcq') {
                // For MCQ, get MCQ questions and calculate ranking
                const mcqQuestions = await MCQ.find({ examId: examId }).exec();
                const ranking = await ReportModel.getMCQRanking(examId, null, mcqQuestions);
                
                // Create ranking map for quick lookup
                if (ranking && ranking.allStudentsRanking) {
                    ranking.allStudentsRanking.forEach((student, index) => {
                        rankingData.set(student.studentId.toString(), index + 1);
                    });
                    console.log(`MCQ ranking generated for ${ranking.allStudentsRanking.length} students`);
                }
            } else if (questionType.toLowerCase() === 'coding') {
                // For Coding, use evaluation results
                const ranking = await ReportModel.getCodingRanking(examId, null);
                
                if (ranking && ranking.allStudentsRanking) {
                    ranking.allStudentsRanking.forEach((student, index) => {
                        rankingData.set(student.studentId.toString(), index + 1);
                    });
                    console.log(`Coding ranking generated for ${ranking.allStudentsRanking.length} students`);
                }
            } else if (questionType.toLowerCase() === 'mcq & coding') {
                // For Mixed, use combined ranking
                const mcqQuestions = await MCQ.find({ examId: examId }).exec();
                const ranking = await ReportModel.getMixedRanking(examId, null, mcqQuestions);
                
                if (ranking && ranking.allStudentsRanking) {
                    ranking.allStudentsRanking.forEach((student, index) => {
                        rankingData.set(student.studentId.toString(), index + 1);
                    });
                    console.log(`Mixed ranking generated for ${ranking.allStudentsRanking.length} students`);
                }
            }
        } catch (rankingError) {
            console.error('Error generating comprehensive ranking data:', rankingError);
            console.log('Falling back to individual report ranking...');
        }
        
        // Batch fetch all detailed reports at once instead of one by one
        const submissionIds = submissions.map(s => s._id);
        let detailedReports = new Map();
        
        try {
            // If ReportModel supports batch operations, use it
            const reports = await ReportModel.find({ submissionId: { $in: submissionIds } }).lean();
            reports.forEach(report => {
                detailedReports.set(report.submissionId.toString(), report);
            });
        } catch (batchError) {
            console.log('Batch report fetch failed, falling back to individual queries');
            // Fallback: fetch reports in smaller batches to avoid overwhelming the system
            const batchSize = 50;
            for (let i = 0; i < submissionIds.length; i += batchSize) {
                const batch = submissionIds.slice(i, i + batchSize);
                try {
                    const batchReports = await Promise.all(
                        batch.map(async (id) => {
                            try {
                                const report = await ReportModel.getAssessmentReport(id);
                                return { id, report };
                            } catch (error) {
                                return { id, report: null };
                            }
                        })
                    );
                    
                    batchReports.forEach(({ id, report }) => {
                        if (report) {
                            detailedReports.set(id.toString(), report);
                        }
                    });
                } catch (error) {
                    console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
                }
            }
        }
        
        // Pre-calculate common values
        const defaultMaxScore = exam.totalMarks || 100;
        
        // Process data more efficiently and collect rank information
        const reportData = [];
        const submissionsWithRanks = [];
        
        // First pass: collect all submission data with ranks
        for (const submission of submissions) {
            if (!submission.student || !submission.student._id) continue;
            
            try {
                const detailedReport = detailedReports.get(submission._id.toString());
                const studentId = submission.student._id.toString();
                
                // Priority order for ranking:
                // 1. Enhanced ranking data (for all question types)
                // 2. Detailed report ranking (fallback for MCQ)
                // 3. null (no ranking available)
                let rank = rankingData.get(studentId) || null;
                
                // Fallback to detailed report ranking if enhanced ranking failed
                if (!rank && detailedReport && detailedReport.ranking) {
                    rank = detailedReport.ranking.rank;
                }
                
                submissionsWithRanks.push({
                    submission,
                    detailedReport,
                    rank
                });
            } catch (error) {
                console.error(`Error processing submission ${submission._id}:`, error);
                continue;
            }
        }
        
        // Sort by rank (lowest rank number first, nulls last)
        // Note: Lower rank number = better performance (Rank 1 = best)
        submissionsWithRanks.sort((a, b) => {
            if (a.rank === null && b.rank === null) return 0;
            if (a.rank === null) return 1;
            if (b.rank === null) return -1;
            return a.rank - b.rank;
        });
        
        console.log(`Sorted ${submissionsWithRanks.length} submissions by rank (lower rank number = better performance)`);
        
        // Log top 5 students for debugging
        if (submissionsWithRanks.length > 0) {
            console.log('Top 5 students by rank:');
            submissionsWithRanks.slice(0, 5).forEach((item, index) => {
                const student = item.submission.student;
                console.log(`${index + 1}. ${student.fname} (USN: ${student.USN}) - Rank: ${item.rank}`);
            });
        }
        
        // Second pass: create report data in rank order
        let serialNumber = 1;
        
        for (const { submission, detailedReport, rank } of submissionsWithRanks) {
            try {
                const studentId = submission.student._id.toString();
                const sessionInfo = activeSessionsMap.get(studentId) || {};
                const evaluationResult = evaluationResultsMap.get(studentId) || {};
                
                // Determine student name efficiently
                const studentName = submission.student.name || 
                    (submission.student.fname && submission.student.lname ? 
                        `${submission.student.fname} ${submission.student.lname}` : 
                        submission.student.fname || 'N/A');
                
                // Calculate scores based on question type
                let maxScore = defaultMaxScore;
                let obtainedScore = submission.score;
                let mcqScore = 'N/A';
                let codingScore = 'N/A';
                let mcqMaxScore = 'N/A';
                let codingMaxScore = 'N/A';
                
                if (questionType.toLowerCase() === 'mcq') {
                    // For MCQ only - use existing logic
                    if (detailedReport && detailedReport.score) {
                        maxScore = detailedReport.score.total;
                        obtainedScore = detailedReport.score.obtained;
                    } else if (!obtainedScore) {
                        maxScore = (submission.mcqAnswers?.length || 0) || defaultMaxScore;
                    }
                } else if (questionType.toLowerCase() === 'coding') {
                    // For Coding only - use EvaluationResult totalScore and maxPossibleScore
                    obtainedScore = evaluationResult.totalScore || 0;
                    maxScore = evaluationResult.maxPossibleScore || exam.totalMarks || 100;
                } else if (questionType.toLowerCase() === 'mcq & coding') {
                    // For Mixed type
                    // Get MCQ score using same logic as MCQ-only
                    if (detailedReport && detailedReport.score) {
                        mcqScore = detailedReport.score.obtained || submission.score || 0;
                        mcqMaxScore = detailedReport.score.total || (submission.mcqAnswers?.length || 0);
                    } else {
                        mcqScore = submission.score || 0;
                        mcqMaxScore = (submission.mcqAnswers?.length || 0);
                    }
                    
                    // Get coding score and max score from EvaluationResult
                    codingScore = evaluationResult.totalScore || 0;
                    codingMaxScore = evaluationResult.maxPossibleScore || exam.codingMaxScore || 50;
                    
                    // Calculate totals
                    obtainedScore = mcqScore + codingScore;
                    maxScore = mcqMaxScore + codingMaxScore;
                }
                
                // Calculate percentage
                const percentage = obtainedScore !== undefined && maxScore > 0 ? 
                    ((obtainedScore / maxScore) * 100).toFixed(2) + '%' : 'N/A';
                
                // Calculate individual percentages for mixed type
                const mcqPercentage = questionType.toLowerCase() === 'mcq & coding' && mcqMaxScore > 0 ? 
                    ((mcqScore / mcqMaxScore) * 100).toFixed(2) + '%' : 'N/A';
                const codingPercentage = questionType.toLowerCase() === 'mcq & coding' && codingMaxScore > 0 ? 
                    ((codingScore / codingMaxScore) * 100).toFixed(2) + '%' : 'N/A';
                
                // Get integrity data
                let integrityScore = submission.integrityScore || 'N/A';
                let integrityStatus = 'Acceptable'; // Default status
                let integrityData = {
                    copyAttempts: 'N/A',
                    focusChanges: 'N/A',
                    fullscreenExits: 'N/A',
                    mouseOuts: 'N/A',
                    pasteAttempts: 'N/A',
                    tabChanges: 'N/A'
                };
                
                if (detailedReport && detailedReport.integrity) {
                    integrityStatus = detailedReport.integrity.status || 'Acceptable';
                    integrityScore = integrityStatus;
                    if (detailedReport.integrity.data) {
                        const data = detailedReport.integrity.data;
                        integrityData = {
                            copyAttempts: data.copyAttempts || 0,
                            focusChanges: data.focusChanges || 0,
                            fullscreenExits: data.fullscreenExits || 0,
                            mouseOuts: data.mouseOuts || 0,
                            pasteAttempts: data.pasteAttempts || 0,
                            tabChanges: data.tabChanges || 0
                        };
                    }
                }
                
                // Use the rank we calculated (either from enhanced ranking or detailed report)
                const finalRank = rank || 'N/A';
                
                // Get time information using the pre-fetched map
                const startedAt = activityTrackersMap.get(studentId) ? 
                    new Date(activityTrackersMap.get(studentId)).toLocaleString() : 'N/A';
                
                let submittedAt = submission.submittedAt ? 
                    new Date(submission.submittedAt).toLocaleString() : 'N/A';
                
                if (detailedReport && detailedReport.timeAnalysis && detailedReport.timeAnalysis.endTime) {
                    submittedAt = new Date(detailedReport.timeAnalysis.endTime).toLocaleString();
                }
                
                // Create row data based on question type
                const baseRowData = {
                    'SN': serialNumber++,
                    'USN': submission.student.USN || 'N/A',
                    'Name': submission.student.fname || studentName,
                    'Started At': startedAt,
                    'Submitted At': submittedAt,
                    'Integrity Score': integrityScore,
                    'Copy Attempts': integrityData.copyAttempts,
                    'Focus Changes': integrityData.focusChanges,
                    'Full Screen Exits': integrityData.fullscreenExits,
                    'Mouse Outs': integrityData.mouseOuts,
                    'Paste Attempts': integrityData.pasteAttempts,
                    'Tab Changes': integrityData.tabChanges,
                    'Rank': finalRank,
                    'IntegrityStatus': integrityStatus // Store for styling
                };
                
                // Add score columns based on question type
                if (questionType.toLowerCase() === 'mcq') {
                    Object.assign(baseRowData, {
                        'Total Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
                        'Maximum Score': maxScore,
                        'Total Percentage': percentage
                    });
                } else if (questionType.toLowerCase() === 'coding') {
                    Object.assign(baseRowData, {
                        'Coding Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
                        'Coding Max Score': maxScore,
                        'Coding Percentage': percentage
                    });
                } else if (questionType.toLowerCase() === 'mcq & coding') {
                    Object.assign(baseRowData, {
                        'MCQ Score': mcqScore,
                        'MCQ Max Score': mcqMaxScore,
                        'MCQ Percentage': mcqPercentage,
                        'Coding Score': codingScore,
                        'Coding Max Score': codingMaxScore,
                        'Coding Percentage': codingPercentage,
                        'Total Score': obtainedScore !== undefined ? obtainedScore : 'N/A',
                        'Total Max Score': maxScore,
                        'Total Percentage': percentage
                    });
                }
                
                reportData.push(baseRowData);
            } catch (submissionError) {
                console.error(`Error processing submission ${submission._id}:`, submissionError);
                continue;
            }
        }
        
        console.log(`Generated report data for ${reportData.length} students`);
        
        // Create Excel workbook efficiently
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Exam Report');
        
        // Define columns based on question type
        let columns = [
            { header: 'SN', key: 'SN', width: 5 },
            { header: 'USN', key: 'USN', width: 15 },
            { header: 'Name', key: 'Name', width: 25 }
        ];
        
        // Add score columns based on question type
        if (questionType.toLowerCase() === 'mcq') {
            columns.push(
                { header: 'Total Score', key: 'Total Score', width: 12 },
                { header: 'Maximum Score', key: 'Maximum Score', width: 15 },
                { header: 'Total Percentage', key: 'Total Percentage', width: 18 }
            );
        } else if (questionType.toLowerCase() === 'coding') {
            columns.push(
                { header: 'Coding Score', key: 'Coding Score', width: 12 },
                { header: 'Coding Max Score', key: 'Coding Max Score', width: 15 },
                { header: 'Coding Percentage', key: 'Coding Percentage', width: 18 }
            );
        } else if (questionType.toLowerCase() === 'mcq & coding') {
            columns.push(
                { header: 'MCQ Score', key: 'MCQ Score', width: 12 },
                { header: 'MCQ Max Score', key: 'MCQ Max Score', width: 15 },
                { header: 'MCQ Percentage', key: 'MCQ Percentage', width: 15 },
                { header: 'Coding Score', key: 'Coding Score', width: 12 },
                { header: 'Coding Max Score', key: 'Coding Max Score', width: 15 },
                { header: 'Coding Percentage', key: 'Coding Percentage', width: 15 },
                { header: 'Total Score', key: 'Total Score', width: 12 },
                { header: 'Total Max Score', key: 'Total Max Score', width: 15 },
                { header: 'Total Percentage', key: 'Total Percentage', width: 18 }
            );
        }
        
        // Add common columns
        columns.push(
            { header: 'Started At', key: 'Started At', width: 25 },
            { header: 'Submitted At', key: 'Submitted At', width: 25 },
            { header: 'Integrity Score', key: 'Integrity Score', width: 15 },
            { header: 'Copy Attempts', key: 'Copy Attempts', width: 15 },
            { header: 'Focus Changes', key: 'Focus Changes', width: 15 },
            { header: 'Full Screen Exits', key: 'Full Screen Exits', width: 18 },
            { header: 'Mouse Outs', key: 'Mouse Outs', width: 15 },
            { header: 'Paste Attempts', key: 'Paste Attempts', width: 15 },
            { header: 'Tab Changes', key: 'Tab Changes', width: 15 },
            { header: 'Rank', key: 'Rank', width: 8 }
        );
        
        worksheet.columns = columns;
        
        // Add data in batches for better memory management
        const batchSize = 100;
        for (let i = 0; i < reportData.length; i += batchSize) {
            const batch = reportData.slice(i, i + batchSize);
            // Remove IntegrityStatus from the data before adding to worksheet
            const cleanBatch = batch.map(row => {
                const { IntegrityStatus, ...cleanRow } = row;
                return cleanRow;
            });
            worksheet.addRows(cleanBatch);
        }
        
        // Apply styling efficiently
        // Header styling
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4F46E5' }
        };
        
        // Apply borders and alignment in batches
        const totalRows = worksheet.rowCount;
        for (let rowNum = 1; rowNum <= totalRows; rowNum++) {
            const row = worksheet.getRow(rowNum);
            
            // Check if this row should have red background (unacceptable integrity)
            const dataRowIndex = rowNum - 2; // Subtract 2 (header row + 0-based index)
            const isUnacceptableIntegrity = dataRowIndex >= 0 && 
                reportData[dataRowIndex] && 
                reportData[dataRowIndex].IntegrityStatus === 'Unacceptable';
            
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                // Apply red background for unacceptable integrity rows (except header)
                if (rowNum > 1 && isUnacceptableIntegrity) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFCCCB' } // Light red background
                    };
                }
                
                // Center align numeric columns (SN, Score columns, Integrity data columns, Rank)
                // This will need to be adjusted based on the actual column positions for each question type
                const isNumericColumn = cell.value !== null && 
                    (typeof cell.value === 'number' || 
                     (typeof cell.value === 'string' && cell.value.includes('%')) ||
                     colNumber === 1 || // SN
                     colNumber === columns.length); // Rank (last column)
                
                if (isNumericColumn) {
                    cell.alignment = { horizontal: 'center' };
                }
            });
        }
        
        // Set filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        let examNameSafe = exam.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${examNameSafe}_${questionType.toLowerCase().replace(/\s+/g, '_')}_report_${timestamp}.xlsx`;
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Write to response stream
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error('Error generating exam report:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Error generating report', 
                message: error.message 
            });
        }
    }
};