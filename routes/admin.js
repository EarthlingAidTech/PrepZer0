const express = require('express');
const router = express.Router()

const admincontroller =  require('./../controllers/admincontroller')
const authenticatecontroller =  require('./../controllers/authenticatecontroller')
const examController = require("../controllers/examcontroller");
const questionController = require("../controllers/questioncontroller");
const mcqquestions = require("../controllers/allmcqcontroller");

router.route("/").get(admincontroller.getcontrol).post(admincontroller.postcontrol)


router.route("/exam/:examId").get(examController.getEditExam).post(examController.postEditExam)
router.route("/exam/delete/:examId").post(examController.deleteExam)


router.route("/exam/questions/:examId").get(questionController.getQuestion)
router.route("/exam/:examId/add/mcq").get(questionController.getaddmcqQuestion).post(questionController.postaddmcqQuestion)
router.route('/exam/:examId/add/coding').get(questionController.getaddcodingQuestion).post(questionController.postaddcodingQuestion)


router.route("/exam/:examId/edit/mcq/:mcqId").get(questionController.getEditmcqQuestion).post(questionController.postEditmcqQuestion)
router.route("/exam/:exaId/delete/mcq/:mcqId").post(questionController.deleteMCQ)
router.route("/exam/:examId/edit/coding/:codingId").get(questionController.getEditcodingQuestion).post(questionController.postEditcodingQuestion)
router.route("/exam/:examId/delete/coding/:codingId").post(questionController.deleteCoding)




router.route("/create_exam").get(examController.getExam).post( examController.createExam);
router.route("/login").get(admincontroller.logingetcontrol).post(admincontroller.loginpostcontrol)
router.route("/signup").get(admincontroller.signupgetcontrol).post(admincontroller.signuppostcontrol)
router.route("/verify/:id").get(authenticatecontroller.getVerified).post(authenticatecontroller.postVerified)



router.route("/mcq-questions").get(mcqquestions.getAllMCQQuestions)

module.exports=router
