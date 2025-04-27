const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const passport =  require('passport')
const { random } = require('lodash')
const { v4: uuidv4 } = require('uuid');
exports.getlogincontrol = (req,res)=>{
    try {
        if(req.isAuthenticated()){
            res.redirect('/')
        }else{
            res.render('login' , {errormsg : "", isStudentPage: true})
        }
    } catch (error) {
        console.log(error)
    }   
 }
 exports.logincontrol =async (req,res)=>{
     
    try {
        const user =new User({
            email: req.body.email, 
            password: req.body.password
        })
        const test = User.findOne({})

       await req.login(user,function(err){
            if(err){
                console.log(err)
                res.render("invalid email or password ")
            }
            else{
                passport.authenticate('local')(req,res,function(){
                    res.redirect('/')
                })
            }
        })
    }catch(error){
        console.log(error)
        res.redirect('/')
    }
     
}


 exports.getsignupcontrol = (req,res)=>{
    res.render('signup' , {errormsg : "", isStudentPage: true})
 }

 exports.signupcontrol = async(req,res)=>{
   
    try {
        if(req.body.password == req.body.passcode){
            const existingUSN = await User.findOne({ USN: req.body.USN.toLowerCase() , userallowed: true });
            if (existingUSN) {
                return res.send("USN already exists");
            }
            const existingUSNwithoutall = await User.findOne({ USN: req.body.USN.toLowerCase() , userallowed: false });
            if (existingUSNwithoutall) {
                await User.deleteOne({ _id: existingUSN._id });
            }
            const usn = req.body.USN.toLowerCase();
            const regex = /^(\d{0,2})by(\d{2})([a-zA-Z]{2})(\d{3})$/;
            const match = usn.match(regex);

            let year = "", department = "", rollNo = "";

            if (match) {
                year = "20" + match[2];
                department = match[3];
                rollNo = match[4];

                console.log("Year:", year);
                console.log("Department:", department);
                console.log("Roll Number:", rollNo);
            } else {
                console.error("Invalid USN format");
                return res.render('signup', { errormsg: "Invalid USN format" });
            }

            randurl = uuidv4()
            
          
            badhttp = "https://prepzer0.co.in/authenticate/verify/"+randurl
            try{
                await sendEmails({
                    email  : req.body.email ,
                    subject : "verify email",
                    html : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification - Prepzer0</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f4f4f4; color: #333;">
  <div style="max-width: 600px; margin: 40px auto; padding: 30px; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #2e86de; margin-bottom: 20px;">Welcome to Prepzer0 🎯</h2>
    <p style="font-size: 16px; line-height: 1.6;">
      Thanks for signing up! You're one step away from accessing your personalized placement test dashboard. Please verify your email address to get started.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${badhttp}" style="background-color: #2e86de; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Verify My Email
      </a>
    </div>
    <p style="font-size: 14px; color: #888;">
      If you didn’t create an account with Prepzer0, you can safely ignore this email.
    </p>
    <p style="font-size: 14px; margin-top: 40px; color: #aaa; text-align: center;">
      &copy; ${new Date().getFullYear()} Prepzer0. All rights reserved.
    </p>
  </div>
</body>
</html>

`
                })
                console.log("the email was sent")

               }catch(error){
                   console.log(error)
                   console.log("maybe email was not sent")
               }


               //dividing the usn into year , department and roll number

   


    

        await  User.register({email : req.body.email, USN: req.body.USN.toLowerCase(), active :"false",randomurl : randurl , Year : year , Department : department , Rollno : rollNo }, req.body.password,(err,user)=>{
            if(err){   
                console.log(err)
                res.render('signup',{errormsg : "email already taken"})
            }
            else{



                User.findOne({email : req.body.email , active : false}).then(user => {
                    if(user != null) {
                        req.session.lau = req.body.email
                        return res.redirect('/authenticate/signup?emailSent=true');
                    } else {
                        passport.authenticate('local')(req, res, function(){
                            res.redirect('/')
                        })
                    }
                }).catch(err => {
                    console.log(err)
                    return res.redirect('/authenticate/signup?emailSent=checking');
                })
  
            }
            console.log(user)
        })


    }else{
        res.render('signup', {errormsg : "password did not mached"})
    }
     } catch (error) {
         console.log(error)
         res.redirect('/')
     }
}
exports.getVerified = async (req, res) => {
    try {
      const user = await User.findOne({ randomurl: req.params.id });
      console.log(user)
      if (user) {
        res.render('verify', { check: req.params.id });
      } else {
        res.render('error', { message: 'Invalid verification link' });
      }
    } catch (error) {
      console.log(error);
      res.render('error', { message: 'Verification failed' });
    }
  }
  
exports.postVerified = async (req, res) => {
    try {
      const otp = req.body.otp;
      const updatedUser = await User.findOneAndUpdate(
        { randomurl: otp },
        { userallowed: true },
        { new: true }
      );
      
      if (updatedUser) {
        res.redirect('/authenticate/login');
      } else {
        res.render('error', { message: 'Verification failed' });
      }
    } catch (error) {
      console.log(error);
      res.render('error', { message: 'Server error during verification' });
    }
  }


 