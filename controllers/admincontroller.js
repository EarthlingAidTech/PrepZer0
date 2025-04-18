const Exam = require("../models/Exam");
const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const { v4: uuidv4 } = require('uuid');
const passport =  require('passport')




exports.getcontrol = async(req,res)=>{
    if(req.isAuthenticated()){
        console.log("authenticated")
        const Userprofile = await User.findById({_id : req.user.id})
        if(Userprofile.usertype == "admin" || Userprofile.usertype == "teacher"){
            const exams = await Exam.find().populate("createdBy", "name");
            console.log(exams.map(exam => exam.numMCQs)); 
            res.render('admin' ,{  pic : Userprofile.imageurl , logged_in :"true" , exams : exams})
        }
        else{
           res.redirect('/admin/login')
        }
    }
    else{
        res.redirect('/admin/login')
    }
}
exports.logingetcontrol = async(req,res)=>{
    res.render('adminlogin')
}


exports.loginpostcontrol = async(req,res)=>{

    try {
        if(req.body.role == "admin" || req.body.role == "teacher" ){
            const user =new User({
                email : req.body.email,
                password : req.body.password,
                usertype : req.body.role,
            })
           await req.login(user,function(err){
                if(err){
                    console.log(err)
                    res.render("invalid email or password ")
                }
                else{
                    passport.authenticate('local')(req,res,function(){
                        console.log("sessions loged  in sucessfully")
                        res.redirect('/admin')
                    })
                }
            })       

        }
        else{
            res.send("invalid role")
        }

    }catch(error){
        console.log(error)
        res.redirect('/admin')
    }
      

  
    
}

exports.signupgetcontrol = async(req,res)=>{
    res.render('adminsignup')
  
    
}
exports.signuppostcontrol = async(req,res)=>{

  
    try {
        if(req.body.password == req.body.passcode){

            randurl = uuidv4()

          
           badhttp = "https://51.20.78.42/authenticate/verify/"+randurl
            try{
                await sendEmails({
                    email  : req.body.email ,
                    subject : "verify email",
                    html : "<h1 style='color : red;'>Email Verify </h1>  <a href="+badhttp+">"+badhttp+"</a>"
                })
                console.log("the email was sent tried to sent to be specific")

               }catch(error){
                   console.log(error)
                   console.log("maybe email was not sent")
               }
               console.log("whats happening")

        await  User.register({email : req.body.email,randomurl : randurl ,usertype : req.body.role,/* Department : req.body.department*/ }, req.body.password,(err,user)=>{
            if(err){   
                console.log(err)
                res.render('signup',{errormsg : "email already taken"})
            }
            else{

                if(User.findOne({email : req.body.email , active : false}) != null ){
                    req.session.lau = req.body.email
                    console.log(req.lau)
                    console.log("sessions")
                    res.redirect('/admin/login')
                }else{
                    passport.authenticate('local')(req,res,function(){
                        res.redirect('/')
                        })
                }
            }
            console.log(user)
        })


    }else{
        res.render('adminsignup', {errormsg : "password did not mached"})
    }
     } catch (error) {
         console.log(error)
         res.redirect('/')
     }

    
}































// exports.getExam = async (req, res) => {
//     res.render('create_exam');
// }

// exports.createExam = async (req, res) => {
    
//     try {
//         const { department, semester, questionType, numMCQs, numCoding, duration, scheduledAt } = req.body;

     
//         const mcqs = await Question.find({
//             department,
//             semester,
//             type: "mcq"
//         }).limit(numMCQs);

//         const codingQuestions = await Question.find({
//             department,
//             semester,
//             type: "coding"
//         }).limit(numCoding);

//         // Create new exam entry
//         const newExam = new Exam({
//             name: `${department} ${semester} Placement Exam`,
//             department,
//             semester,
//             questionType,
//             numMCQs,
//             numCoding,
//             questions: [...mcqs, ...codingQuestions],
//             duration,
//             scheduledAt,
//             // createdBy: req.user.id  // Assuming req.user is populated with the logged-in user
//         });

//         // Save the exam to the database
//         await newExam.save();
//         // res.render('exam');
//         res.status(201).json({
//             message: "Exam created successfully",
//             exam: newExam
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Server error" });
//     }
// };