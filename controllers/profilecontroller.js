const User = require('./../models/usermodel')
const { v4: uuidv4 } = require('uuid');
exports.getprofilecontrol = async(req,res)=>{
    if(req.isAuthenticated()){
        const Userprofile = await User.findById({_id : req.user.id})
        if(!Userprofile){
            console.log("no data found")
        }else{
            if(Userprofile.usertype == "admin"){
                res.render('adminprofile' ,{name : Userprofile.fname  ,email : Userprofile.email, USN : "" ,  pic : Userprofile.imageurl ,location : Userprofile.location ,phone :Userprofile.phone , department : "" , sem : "" , year : "" , rollno : "" , usertype : Userprofile.usertype })
            }else if(Userprofile.usertype == "teacher"){
                res.render('profile' ,{name : Userprofile.fname  ,email : Userprofile.email, USN : "" ,  pic : Userprofile.imageurl ,location : Userprofile.location ,phone :Userprofile.phone , department : Userprofile.Department , sem : "" , year : "" , rollno : "" , usertype : Userprofile.usertype })
            }else{
                res.render('profile' ,{name : Userprofile.fname  ,email : Userprofile.email, USN : Userprofile.USN ,  pic : Userprofile.imageurl ,location : Userprofile.location ,phone :Userprofile.phone , department : Userprofile.Department , sem : Userprofile.Semester , year : Userprofile.Year , rollno : Userprofile.Rollno , usertype : Userprofile.usertype })
            }
            
        }
    }else{
        res.redirect('/')
    } 
}

exports.getprofile_editcontrol = async(req,res)=>{
    if(req.isAuthenticated()){
        
        const Userprofile = await User.findById({_id : req.user.id})
        if(!Userprofile){
            console.log("no data found")
        }else{ 
            if(Userprofile.usertype == "admin"){
                res.render('profile_edit' ,{name : Userprofile.fname  ,email : Userprofile.email, USN : "" ,  pic : Userprofile.imageurl ,location : Userprofile.location ,phone :Userprofile.phone , department : "" , sem : "" , year : "" , rollno : "" , usertype : Userprofile.usertype })
            }else if(Userprofile.usertype == "teacher"){
                res.render('profile_edit' ,{name : Userprofile.fname  ,email : Userprofile.email, USN : "" ,  pic : Userprofile.imageurl ,location : Userprofile.location ,phone :Userprofile.phone , department : Userprofile.Department , sem : "" , year : "" , rollno : "" , usertype : Userprofile.usertype })
            }else{
                res.render('profile_edit' ,{name : Userprofile.fname  ,email : Userprofile.email, USN : Userprofile.USN ,  pic : Userprofile.imageurl ,location : Userprofile.location ,phone :Userprofile.phone , department : Userprofile.Department , sem : Userprofile.Semester , year : Userprofile.Year , rollno : Userprofile.Rollno , usertype : Userprofile.usertype })
            }
        }
    }else{
        res.redirect('/')
    } 
}



// exports.profile_editcontrol = async (req, res) => {
//     console.log("Profile edit control testing");

//     if (!req.isAuthenticated()) {
//         return res.redirect('/');
//     }
//     console.log(req.body);
//     let updateFields = {
//         fname: req.body.name,
//         phone: req.body.number,
//         location: req.body.location
//     };

//     if (req.user.usertype === "student") {
//         updateFields.Semester = req.body.sem;
//     } else if (req.user.usertype === "teacher") {
//         updateFields.department = req.body.department;
//     }

//     if (req.file) {
//         updateFields.imageurl = '/uploads/' + req.file.filename;
//     }

//     try {
//         const updatedProfile = await User.findByIdAndUpdate(req.user.id, updateFields, { new: true });

//         if (!updatedProfile) {
//             console.log("Profile not updated");
//         } else {
//             console.log(updatedProfile);
//         }

//         res.redirect('/profile');
//     } catch (error) {
//         console.error("Error updating profile:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };

exports.profile_editcontrol = async (req, res) => {
    console.log('Profile edit control triggered');
  
    if (!req.isAuthenticated()) {
      return res.redirect('/');
    }
  
    const updateFields = {
      fname: req.body.name,
      phone: req.body.number,
      location: req.body.location,
    };
  
    if (req.user.usertype === 'student') {
      updateFields.Semester = req.body.sem;
    } else if (req.user.usertype === 'teacher') {
      updateFields.department = req.body.department;
    }
  
    if (req.body.profileImageUrl) {
      updateFields.imageurl = req.body.profileImageUrl;
    }
  
    try {
      const updatedUser = await User.findByIdAndUpdate(req.user.id, updateFields, { new: true });
      if (!updatedUser) {
        console.log('No user updated');
      } else {
        console.log('User updated:', updatedUser);
      }
      res.redirect('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  



exports.getchangepasscontrol =async(req,res)=>{
    if(req.isAuthenticated()){
        const googleUSer =await User.findById({_id :req.user.id})
        
        if(!googleUSer.googleId || googleUSer.googleId == null ){
            res.render('changepass')
        }else{
            res.render("googleusererror",{errormsg : "You are logged in using google"})
        }
        
    }else{

    }

 
}
exports.changepasscontrol = async(req,res)=>{
    if(req.isAuthenticated()){
        if(req.body.newpassword == req.body.confirmpassword){

      
        const UpdatePassword = await User.findById({_id :req.user.id})
        console.log(UpdatePassword)
        if(!UpdatePassword){
            console.log('cannot get the user to update passsword')
        }else{
            UpdatePassword.changePassword(req.body.oldpassword, req.body.newpassword, function(err){
                if(err){
                    console.log(err)
                }else{
                    console.log('password updated')
                    res.redirect('/profile')
                }
            })
        }
    }else{
        res.render('changepass',{errormsg : "password not mached"})
    }
    }else{
        res.redirect('/')
    }
}

 


