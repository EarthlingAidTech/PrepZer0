const User = require('./../models/usermodel')
exports.getcontrol = async (req,res)=>{
    if(req.isAuthenticated()){
        const Userprofile = await User.findById({_id : req.user.id})
        if(Userprofile.usertype != "admin"){
            res.redirect("/")
        }
        else{
        res.render('supadmin' ,{  pic : Userprofile.imageurl , logged_in :"true"})
        }

     
    }
    else{
        res.redirect("/")
       
    }
    
}


