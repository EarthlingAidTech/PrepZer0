const express = require('express');
const router = express.Router()

const authenticatecontroller =  require('./../controllers/authenticatecontroller')

router.route("/login").get(authenticatecontroller.getlogincontrol).post(authenticatecontroller.logincontrol)
router.route("/signup").get(authenticatecontroller.getsignupcontrol).post(authenticatecontroller.signupcontrol)
router.route("/verify/:id").get(authenticatecontroller.getVerified).post(authenticatecontroller.postVerified)
module.exports=router
