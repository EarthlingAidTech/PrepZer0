const express = require('express');
const router = express.Router()
const path = require('path');

const supadmincontroller =  require('./../controllers/supadmin')
router.route("/").get(supadmincontroller.getcontrol).post(supadmincontroller.postcontrol)
module.exports=router