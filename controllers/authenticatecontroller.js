const sendEmails = require("./../utils/email");
const User = require("./../models/usermodel");
const passport = require("passport");
const { random } = require("lodash");
const { v4: uuidv4 } = require("uuid");
randurl = "";
exports.getlogincontrol = (req, res) => {
  try {
    if (req.isAuthenticated()) {
      res.redirect("/");
    } else {
      res.render("login", { errormsg: "" });
    }
  } catch (error) {
    console.log(error);
  }
};
exports.logincontrol = async (req, res) => {
  try {
    const user = new User({
      email: req.body.email,
      password: req.body.password,
    });
    const test = User.findOne({});

    await req.login(user, function (err) {
      if (err) {
        console.log(err);
        res.render("invalid email or password ");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/");
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
};

exports.getsignupcontrol = (req, res) => {
  res.render("signup", { errormsg: "" });
};

exports.signupcontrol = async (req, res) => {
  try {
    if (req.body.password == req.body.passcode) {
      randurl = uuidv4();

      badhttp = "http://localhost:3000/authenticate/verify/" + randurl;
      try {
        await sendEmails({
          email: req.body.email,
          subject: "verify email",
          html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Email</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', sans-serif; background-color: #f8f8f8; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #f1f6ff, #ffffff); overflow: hidden; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);">
        <div style="background: linear-gradient(135deg, #5150ea, #8639ea); color: #ffffff; padding: 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 34px; font-weight: 800;">Earthling Aid Tech</h1>
        </div>
        <div style="padding: 40px; color: #333333; line-height: 1.8;">
            <h2 style=" text-align: center; font-size: 28px; font-weight: 500;">Verify Your Email</h2>
            <p style="font-size: 16px; color: #5150ea;">Hi there,</p>
            <p style="margin-bottom: 24px; font-size: 16px; color: #5150ea;">Thank you for signing up. Please click the button below to verify your email address and get started.</p>
            <div style="text-align: center;">
                <a href="${badhttp}" style="display: inline-block; background: linear-gradient(135deg, #5150ea, #8639ea); color: #ffffff; padding: 10px 35px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background 0.3s ease;">Verify Email</a>
            </div>
            <p style="margin-top: 25px; text-align: center; color: #777; font-size: 14px;">If you didn’t sign up for this account, please ignore this email or contact our support team.</p>
            <p style="margin-top: 40px; font-size: 16px;">Thanks,<br><strong>Earthling Aid Tech Team</strong></p>
        </div>
        <div style="background-color: #5150ea; color: #ffffff; padding: 15px; text-align: center; font-size: 13px;">
            <p style="margin: 0;">&copy; 2025 Earthling Aid Tech. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
        });
        console.log("the email was sent tried to sent to be specific");
      } catch (error) {
        console.log(error);
        console.log("maybe email was not sent");
      }

      //dividing the usn into year , department and roll number

      const usn = req.body.USN;
      const regex = /^(\d{0,2})by(\d{2})([a-zA-Z]{2})(\d{3})$/;
      const match = usn.match(regex);

      let year = "",
        department = "",
        rollNo = "";

      if (match) {
        year = "20" + match[2];
        department = match[3];
        rollNo = match[4];

        console.log("Year:", year);
        console.log("Department:", department);
        console.log("Roll Number:", rollNo);
      } else {
        console.error("Invalid USN format");
        return res.render("signup", { errormsg: "Invalid USN format" });
      }

      await User.register(
        {
          email: req.body.email,
          USN: req.body.USN,
          active: "false",
          randomurl: randurl,
          Year: year,
          Department: department,
          Rollno: rollNo,
        },
        req.body.password,
        (err, user) => {
          if (err) {
            console.log(err);
            res.render("signup", { errormsg: "email already taken" });
          } else {
            if (
              User.findOne({ email: req.body.email, active: false }) != null
            ) {
              req.session.lau = req.body.email;
              console.log(req.lau);
              console.log("sessions");
              res.redirect("/authenticate/login");
            } else {
              passport.authenticate("local")(req, res, function () {
                res.redirect("/");
              });
            }
          }
          console.log(user);
        }
      );
    } else {
      res.render("signup", { errormsg: "password did not mached" });
    }
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
};
exports.getVerified = (req, res) => {
  if (req.params.id == randurl) {
    res.render("verify", {
      check: req.params.id,
    });
  }
};
exports.postVerified = (req, res) => {
  otp = req.body.otp;
  User.findOneAndUpdate(
    { randomurl: otp },
    { userallowed: true },
    (err, doc) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    }
  );
};
