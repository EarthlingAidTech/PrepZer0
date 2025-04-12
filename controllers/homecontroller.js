const User = require('./../models/usermodel')
exports.getcontrol = async (req,res)=>{
    if(req.isAuthenticated()){
        const Userprofile = await User.findById({_id : req.user.id})
        res.render('home' ,{  pic : Userprofile.imageurl , logged_in :"true"})
    }
    else{
        res.render('home' ,{  pic : "https://www.business2community.com/wp-content/uploads/2017/08/blank-profile-picture-973460_640.png" , logged_in :"false"})
       
    }
    
}


