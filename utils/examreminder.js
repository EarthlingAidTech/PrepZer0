// utils/examReminder.js
const schedule = require('node-schedule');
const Exam = require('../models/Exam');
const User = require('../models/usermodel');
const sendEmails = require('./email');
const moment = require('moment-timezone');

// Store job references so we can cancel them if needed
const scheduledJobs = {};

// Schedule reminder for a specific exam
async function scheduleExamReminder(exam) {
  try {
    // Cancel any existing job for this exam
    if (scheduledJobs[exam._id]) {
      scheduledJobs[exam._id].cancel();
      console.log(`Canceled existing reminder job for exam: ${exam.name}`);
    }

    // Calculate reminder time (15 minutes before exam)
    const reminderTime = moment(exam.scheduledAt).subtract(15, 'minutes').toDate();
    const now = new Date();

    // Only schedule if reminder time is in the future and exam is not in draft status
    if (reminderTime > now && exam.testStatus !== 'draft') {
      console.log(`Scheduling reminder for exam ${exam.name} at ${reminderTime}`);

      // Schedule the job
      scheduledJobs[exam._id] = schedule.scheduleJob(reminderTime, async () => {
        try {
          // Find all students in the specified departments and semester
          const students = await User.find({
            usertype: 'student',
            department: { $in: exam.departments },
            semester: exam.semester
          });

          console.log(`Sending exam reminders to ${students.length} students for exam: ${exam.name}`);

         
          for (const student of students) {
            await sendEmails({
              email: student.email,
              subject: `Reminder: ${exam.name} starts in 15 minutes`,
              html: `
                <h2>Exam Reminder</h2>
                <p>Hello ${student.name || 'Student'},</p>
                <p>This is a reminder that your exam <strong>${exam.name}</strong> will start in 15 minutes.</p>
                <p>Exam Details:</p>
                <ul>
                  <li>Start time: ${moment(exam.scheduledAt).format('MMMM Do YYYY, h:mm a')}</li>
                  <li>Duration: ${exam.duration} minutes</li>
                  <li>Type: ${exam.questionType}</li>
                </ul>
                <p>Please log in to the system a few minutes before the exam starts.</p>
                <p>Good luck!</p>
                <p>PrepZer0 Team</p>
              `
            });
          }
          
          console.log(`Successfully sent reminders for exam: ${exam.name}`);
        } catch (error) {
          console.error(`Error sending exam reminders: ${error}`);
        }
      });
      
      return true;
    } else {
      console.log(`Not scheduling reminder for exam ${exam.name}: reminder time is in the past or exam is draft`);
      return false;
    }
  } catch (error) {
    console.error(`Error scheduling reminder for exam ${exam._id}: ${error}`);
    return false;
  }
}

// Function to schedule reminders for all exams (call this on server startup)
async function scheduleAllExamReminders() {
  try {
    // Find all exams that haven't started yet
    const now = new Date();
    const upcomingExams = await Exam.find({
      scheduledAt: { $gt: now },
      testStatus: { $ne: 'draft' } 
    });
    
    console.log(`Found ${upcomingExams.length} upcoming exams to schedule reminders for`);
    
    for (const exam of upcomingExams) {
      await scheduleExamReminder(exam);
    }
    
    return true;
  } catch (error) {
    console.error('Error scheduling all exam reminders:', error);
    return false;
  }
}

// Function to cancel a specific reminder
function cancelExamReminder(examId) {
  if (scheduledJobs[examId]) {
    scheduledJobs[examId].cancel();
    delete scheduledJobs[examId];
    console.log(`Canceled reminder for exam: ${examId}`);
    return true;
  }
  return false;
}

module.exports = {
  scheduleExamReminder,
  scheduleAllExamReminders,
  cancelExamReminder
};