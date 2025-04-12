//constants 
const express = require('express');
const router = express.Router()
//calling homecontroller from controller
const homecontroller =  require('./../controllers/homecontroller')
console.log("msnsdgubkuytddvsyh")

router.route("/").get(homecontroller.getcontrol)


router.route("/login").get((req,res)=>{
    res.redirect('/')
})

module.exports=router
