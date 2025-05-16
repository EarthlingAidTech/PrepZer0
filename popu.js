const mongoose = require('mongoose');
const crypto = require('crypto');

// Connect to MongoDB
const mongoUrl = 'mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoUrl)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Import models from your schemas
const User = require('./models/usermodel');
const Exam = require('./models/Exam');
const Submission = require('./models/SubmissionSchema');
const MCQ = require('./models/MCQQuestion');
const ActivityTracker = require('./models/ActiveSession');
const Integrity = require('./models/Integrity');

async function populateExamData() {
  try {
    // Define the exam ID
    const examId = mongoose.Types.ObjectId('681f7c14e9cdef77ed1f8346');
    
    // Get the exam details
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error('Exam not found!');
      return;
    }
    console.log(`Found exam: ${exam.name}`);
    
    // Get all MCQ questions for this exam
    const mcqQuestions = await MCQ.find({ examId: examId });
    console.log(`Found ${mcqQuestions.length} MCQ questions`);
    
    if (mcqQuestions.length === 0) {
      console.error('No MCQ questions found for this exam!');
      return;
    }
    
    // Find all users who are students and match the exam's department and semester
    const eligibleStudents = await User.find({
      usertype: 'student',
      Department: { $in: exam.departments },
      Semester: exam.semester,
      userallowed: true
    });
    console.log(`Found ${eligibleStudents.length} eligible students`);
    
    // Get existing submissions for this exam
    const existingSubmissions = await Submission.find({ exam: examId });
    const submittedStudentIds = existingSubmissions.map(sub => sub.student.toString());
    console.log(`Found ${existingSubmissions.length} existing submissions`);
    
    // Filter out students who already have submissions
    const studentsWithoutSubmissions = eligibleStudents.filter(
      student => !submittedStudentIds.includes(student._id.toString())
    );
    console.log(`Found ${studentsWithoutSubmissions.length} students without submissions`);
    
    if (studentsWithoutSubmissions.length === 0) {
      console.log('All eligible students already have submissions!');
      return;
    }
    
    // Randomly select 5 students or fewer if less than 5 are available
    const numStudentsToAdd = Math.min(10, studentsWithoutSubmissions.length);
    const selectedStudents = [];
    
    // Fisher-Yates shuffle algorithm
    const shuffled = [...studentsWithoutSubmissions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    for (let i = 0; i < numStudentsToAdd; i++) {
      selectedStudents.push(shuffled[i]);
    }
    
    console.log(`Selected ${selectedStudents.length} students to add submissions for`);
    
    // Get the exam duration in minutes
    const examDurationMinutes = exam.duration || 60; // Default to 60 minutes if not specified
    
    // For each selected student, create submission, activity, and integrity records
    for (const student of selectedStudents) {
      console.log(`Creating data for student: ${student.fname} ${student.lname} (${student.USN})`);
      
      // Determine if this student passes integrity (60% chance)
      const passesIntegrity = Math.random() < 0.6;
      
      // Generate random exam duration (between 50% and 100% of allowed time)
      const completionTimeMinutes = Math.floor(examDurationMinutes * (0.5 + Math.random() * 0.5));
      
      // Calculate submission timing
      const submissionDate = new Date(exam.scheduledAt);
      submissionDate.setMinutes(submissionDate.getMinutes() + completionTimeMinutes);
      
      // Create MCQ answers
      const mcqAnswers = mcqQuestions.map(question => {
        // Generate random answer (70% chance of correct if passes integrity, 40% if not)
        const correctProbability = passesIntegrity ? 0.7 : 0.4;
        const selectsCorrect = Math.random() < correctProbability;
        
        let selectedOption;
        if (selectsCorrect) {
          selectedOption = question.correctAnswer;
        } else {
          // Select a random incorrect option
          const incorrectOptions = question.options.filter(opt => opt !== question.correctAnswer);
          const randomIndex = Math.floor(Math.random() * incorrectOptions.length);
          selectedOption = incorrectOptions[randomIndex];
        }
        
        return {
          questionId: question._id,
          selectedOption
        };
      });
      
      // Calculate score based on correct answers
      let score = 0;
      for (const answer of mcqAnswers) {
        const question = mcqQuestions.find(q => q._id.toString() === answer.questionId.toString());
        if (question && answer.selectedOption === question.correctAnswer) {
          score += question.marks;
        }
      }
      
      // Create submission record
      const submission = new Submission({
        exam: examId,
        student: student._id,
        mcqAnswers,
        score,
        submittedAt: submissionDate
      });
      
      await submission.save();
      console.log(`Created submission with score ${score}`);
      
      // Create activity tracker
      const activityTracker = new ActivityTracker({
        examId,
        userId: student._id,
        status: 'inactive', // Since exam is completed
        startedAt: new Date(exam.scheduledAt),
        lastPingTimestamp: submissionDate,
        pingHistory: generateActivityHistory(exam.scheduledAt, submissionDate)
      });
      
      await activityTracker.save();
      console.log('Created activity tracker');
      
      // Create integrity record
      const integrityViolations = passesIntegrity ? 
        generatePassingIntegrityData() : 
        generateFailingIntegrityData();
      
      const integrity = new Integrity({
        examId,
        userId: student._id,
        ...integrityViolations,
        screenConfiguration: getRandomScreenConfig(),
        lastEvent: 'Exam Completed',
        timestamps: submissionDate
      });
      
      await integrity.save();
      console.log(`Created integrity record (${passesIntegrity ? 'PASSING' : 'FAILING'})`);
    }
    
    console.log('Finished populating exam data!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Helper function to generate random integrity data that passes the check
function generatePassingIntegrityData() {
  return {
    tabChanges: Math.floor(Math.random() * 2),
    mouseOuts: Math.floor(Math.random() * 2),
    fullscreenExits: 0,
    copyAttempts: Math.floor(Math.random() * 2),
    pasteAttempts: 0,
    focusChanges: Math.floor(Math.random() * 2)
  };
}

// Helper function to generate random integrity data that fails the check
function generateFailingIntegrityData() {
  return {
    tabChanges: 1 + Math.floor(Math.random() * 3),
    mouseOuts: 1 + Math.floor(Math.random() * 2),
    fullscreenExits: 1 + Math.floor(Math.random() * 2),
    copyAttempts: Math.floor(Math.random() * 3),
    pasteAttempts: Math.floor(Math.random() * 2),
    focusChanges: 1 + Math.floor(Math.random() * 3)
  };
}

// Helper function to generate activity history
function generateActivityHistory(startTime, endTime) {
  const history = [];
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const duration = endDate - startDate;
  
  // Generate between 5-15 ping events
  const numEvents = 5 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < numEvents; i++) {
    const timeOffset = Math.random() * duration;
    const eventTime = new Date(startDate.getTime() + timeOffset);
    
    // Most events should be active, with occasional inactive
    const status = Math.random() < 0.85 ? 'active' : 'inactive';
    
    history.push({
      timestamp: eventTime,
      status
    });
  }
  
  // Sort by timestamp
  history.sort((a, b) => a.timestamp - b.timestamp);
  
  return history;
}

// Helper function to get random screen configuration
function getRandomScreenConfig() {
  const resolutions = [
    '1920x1080', '1366x768', '1440x900', 
    '1280x720', '1536x864', '2560x1440'
  ];
  
  const browsers = [
    'Chrome', 'Firefox', 'Edge', 'Safari'
  ];
  
  const devices = [
    'Windows', 'MacOS', 'Linux'
  ];
  
  const resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
  const browser = browsers[Math.floor(Math.random() * browsers.length)];
  const device = devices[Math.floor(Math.random() * devices.length)];
  
  return `${resolution} | ${browser} | ${device}`;
}

// Run the function
populateExamData()
  .then(() => console.log('Script completed successfully!'))
  .catch(err => console.error('Script failed:', err));