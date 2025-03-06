const express = require('express');
const router = express.Router()

//calling homecontroller from controller
const dashboardcontroller =  require('./../controllers/dashboardcontroller')

router.route("/").get(dashboardcontroller.getcontrol)
router.route("/start-test/:examId").get(dashboardcontroller.getStartExam)
router.route("/submit-test").post(dashboardcontroller.postStartExam)

module.exports=router
