const mongoose  = require("mongoose");
const crypto = require('crypto')
var validator = require('validator');
const passportLocalMongoose = require('passport-local-mongoose')
const findOrCreate = require('mongoose-findorcreate');
const { random } = require("lodash");
const UserSchema = new mongoose.Schema({
        email : {
           type : String ,
            minlength : 4 , 
            maxlength : 55 ,
            trim : true , 
            default : "N  /  A",
            unique : true ,
        }, 
        active : {
            type : Boolean,
            default : false
        },
        USN : { //
            type : String , 
            unique : true , 
            require : true ,
        } ,
        fname : {
            type : String , 
            minlength : 3  ,
            maxlength  : 20 
           
        },
        lname : {
            type : String , 
            minlength : 2  ,
            maxlength  : 15 
           
        },
        usertype: {
            type : String ,
            default: "student",
            enum : ["student","admin","teacher"],required : true
        },
        userallowed : {
            type : Boolean, 
            default : false ,
        },

        dataid : {
            type : String 
        }
        ,
        Department :  { 
            type: String,
            enum: ["ad", "is", "cs", "et", "ec", "ai", "cv"] // enum: ["MCA", "ISE", "CSE", "ETE", "CIV", "COM", "AI"]
             },
      
        Year : {
            type : String ,
            
        }
        ,
        admin_access : {
            default : false ,
            type : Boolean,
            },
        Rollno : {
            type : String ,
            
        },  
        Semester: { 
            type: Number,
             min: 1, max: 8 
            }, 

        password : String ,
        phonecode :{
            type : String ,
            maxlength : 4
        } ,
        location :{
            type : String
        },
        phone : {
        type : Number ,
        minlength : 10 ,
        maxlength : 10
        } ,
            imageurl : {
            type : String ,
            default : "https://cdn-icons-png.flaticon.com/128/456/456212.png"
        },
        created : {
            type : Date , 
            default : Date.now()
        },
        randomurl : {
            type : String ,
        },
        passwordresettoken : String ,
        passwordresetdate : Date ,
   
  
    //USN==> location + Year + Dept + Rollno
    //1BY22CS001==> BY + 22 + CS + 001 
   
})

UserSchema.plugin(passportLocalMongoose, { usernameField : 'email' })
UserSchema.plugin(findOrCreate)
UserSchema.methods.createpasswordresettoken = function(){
const resetToken = crypto.randomBytes(32).toString('hex');
this.passwordresettoken = crypto
.createHash('sha256')
.update(resetToken)
.digest('hex')

this.passwordresetdate = Date.now() + 10 *60*1000
console.log(resetToken , this.passwordresettoken)


return resetToken

}
const User =  mongoose.model('User', UserSchema)
module.exports = User