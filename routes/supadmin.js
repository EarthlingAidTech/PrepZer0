const express = require('express');
const router = express.Router()


const supadmincontroller =  require('../controllers/supadmin')
router.route("/").get(supadmincontroller.getcontrol)

module.exports=router