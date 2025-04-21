const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const passport =  require('passport')
const { random } = require('lodash')
const { v4: uuidv4 } = require('uuid');
randurl = ""
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
            const existingUSN = await User.findOne({ USN: req.body.USN });
            if (existingUSN) {
                return res.send("USN already exists");
            }
            randurl = uuidv4()
            
          
           badhttp = "http://51.20.78.42/authenticate/verify/"+randurl
            try{
                await sendEmails({
                    email  : req.body.email ,
                    subject : "verify email",
                    html : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Inter', sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .container {
      background: #1e293b;
      padding: 3rem 2.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      max-width: 450px;
      width: 100%;
      text-align: center;
    }

    .container h2 {
      margin-bottom: 1.5rem;
      font-weight: 600;
      font-size: 1.5rem;
    }

    button {
      width: 100%;
      padding: 0.9rem;
      background-color: #0ea5e9;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    button:hover {
      background-color: #0284c7;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify Your Email</h2>
    <form action="${badhttp}" method="POST">
      <button type="submit">Click to Verify</button>
    </form>
  </div>
</body>
</html>
`
                })
                console.log("the email was sent tried to sent to be specific")

               }catch(error){
                   console.log(error)
                   console.log("maybe email was not sent")
               }


               //dividing the usn into year , department and roll number

               const usn = req.body.USN;
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


    

        await  User.register({email : req.body.email, USN: req.body.USN, active :"false",randomurl : randurl , Year : year , Department : department , Rollno : rollNo }, req.body.password,(err,user)=>{
            if(err){   
                console.log(err)
                res.render('signup',{errormsg : "email already taken"})
            }
            else{

                if(User.findOne({email : req.body.email , active : false}) != null ){
                    req.session.lau = req.body.email
                    console.log(req.lau)
                    console.log("sessions")
                    res.redirect('/authenticate/login')
                }else{
                    passport.authenticate('local')(req,res,function(){
                        res.redirect('/')
                        })
                }
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
exports.getVerified = (req,res)=>{
    if(req.params.id == randurl){
        res.render('verify' , {
            check : req.params.id
        })
    }
}
exports.postVerified = (req,res)=>{   
    otp = req.body.otp 
    User.findOneAndUpdate({randomurl : otp} , {userallowed: true} ,  (err,doc)=>{
            if(err){
                console.log(err)
            }else{
                res.redirect('/')
            }
        })    



}


 