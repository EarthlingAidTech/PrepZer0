const express = require('express');
const router = express.Router()
const path = require('path');
const multer = require('multer');

const admincontroller =  require('./../controllers/admincontroller')
const authenticatecontroller =  require('./../controllers/authenticatecontroller')
const examController = require("../controllers/examcontroller");
const questionController = require("../controllers/questioncontroller");
const mcqquestions = require("../controllers/allmcqcontroller");
const reportController = require("../controllers/reportController");

router.route("/").get(admincontroller.getcontrol).post(admincontroller.postcontrol)


router.route("/exam/:examId").get(examController.getEditExam).post(examController.postEditExam)
router.route("/exam/delete/:examId").post(examController.deleteExam)


router.route("/exam/questions/:examId").get(questionController.getQuestion)
router.route("/exam/:examId/add/mcq").get(questionController.getaddmcqQuestion).post(questionController.postaddmcqQuestion)
router.route('/exam/:examId/add/coding').get(questionController.getaddcodingQuestion).post(questionController.postaddcodingQuestion)


router.route("/exam/:examId/edit/mcq/:mcqId").get(questionController.getEditmcqQuestion).post(questionController.postEditmcqQuestion)
router.route("/exam/:examId/delete/mcq/:mcqId").post(questionController.deleteMCQ)
router.route("/exam/:examId/edit/coding/:codingId").get(questionController.getEditcodingQuestion).post(questionController.postEditcodingQuestion)
router.route("/exam/:examId/delete/coding/:codingId").post(questionController.deleteCoding)








router.route("/create_exam").get(examController.getExam).post( examController.createExam);
router.route("/login").get(admincontroller.logingetcontrol).post(admincontroller.loginpostcontrol)
router.route("/signup").get(admincontroller.signupgetcontrol).post(admincontroller.signuppostcontrol)
router.route("/verify/:id").get(authenticatecontroller.getVerified).post(authenticatecontroller.postVerified)



router.route("/mcq-questions").get(mcqquestions.getAllMCQQuestions)

router.route("/profile/students").get(admincontroller.allStudents)

router.route("/exam/candidates/:examId").get(admincontroller.examCandidates)

router.route("/exam/submission/:submissionId").get(reportController.viewAssessmentReport)

router.route("/search_student").get(examController.searchStudent)

// Get eligible students for an exam
router.route('/exam/:examId/eligible-students').get(examController.getEligibleStudents);




// Multer setup
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, 'mcq-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    if (path.extname(file.originalname) !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// Routes
router.route("/exam/:examId/csv").get(mcqquestions.csvPage)

// router.route("/upload-mcq-csv").post(upload.single('csvFile'), mcqquestions.uploadMCQCSV)
router.route("/exam/:examId/upload-mcq-csv").post(upload.single('csvFile'), mcqquestions.uploadMCQCSV)



module.exports=router
