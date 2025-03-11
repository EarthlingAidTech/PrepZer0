const User = require("./../models/usermodel");
const sendEmails = require("./../utils/email");
const crypto = require("crypto");
exports.getforgotcontrol = async (req, res) => {
  res.render("forgotpass", { errormsg: "" });
};

exports.forgotcontrol = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  console.log(user);
  if (!user) {
    console.log("no user found");
    res.render("forgotpass", {
      errormsg: "no account with the provided email ",
    });
  } else {
    const resetToken = user.createpasswordresettoken();
    await user.save({ validateBeforeSave: false });
    console.log(resetToken + "its from the auth route forgot password route");
    // const reseturl = `localhost:3001/user/resetpassword/${resetToken}`
    console.log();
    try {
      await sendEmails({
        email: req.body.email,
        subject: "reset password",
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', sans-serif; background-color: #f8f8f8; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #f1f6ff, #ffffff); border-radius: 10px; overflow: hidden; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);">
        <div style="background: linear-gradient(135deg, #5150ea, #8639ea); color: #ffffff; padding: 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 34px; font-weight: 800;">Earthling Aid Tech</h1>
        </div>
        <div style="padding: 40px; color: #333333; line-height: 1.8;">
            <h2 style=" text-align: center; font-size: 28px; font-weight: 500;">Reset Your Password</h2>
            <p style="font-size: 16px; color: #5150ea;">Hi there,</p>
            <p style="margin-bottom: 24px; font-size: 16px; color: #5150ea;">We received a request to reset your password. Please use the link below to proceed:</p>
            <div style="text-align: center; margin-top: 20px;">
                <a href='http://localhost:3000/user/resetpassword/${resetToken}' style="display: inline-block; background: linear-gradient(135deg, #5150ea, #8639ea); color: #ffffff; padding: 10px 35px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background 0.3s ease;">Click Here</a>
            </div>
            <p style="margin-top: 25px; text-align: center; color: #777; font-size: 14px;">If you didn’t request a password reset, please ignore this email or contact our support team.</p>
            <p style="margin-top: 40px; font-size: 16px;">Thanks,<br><strong>Earthling Aid Tech Team</strong></p>
        </div>
        <div style="background-color: #5150ea; color: #ffffff; padding: 15px; text-align: center; font-size: 13px;">
            <p style="margin: 0;">&copy; 2025 Earthling Aid Tech. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`,
      });

      res.redirect("/");
    } catch (error) {
      console.log(error);
      console.log("error but dont know why");
      user.passwordresettoken = undefined;
      user.passwordresetdate = undefined;
      await user.save({ validateBeforeSave: false });
    }
  }
};
exports.getresetcontrol = async (req, res) => {
  const hashedtoken = crypto
    .createHash("sha256")
    .update(req.params.id)
    .digest("hex");
  console.log(hashedtoken);
  const users = await User.findOne({
    passwordresettoken: hashedtoken,
    passwordresetdate: { $gt: Date.now() },
  });
  console.log(users);
  if (!users) {
    console.log("url not valid");
    res.redirect("/");
  } else {
    res.render("resetpass", { resttoken: req.params.id });
  }
};

exports.resetcontrol = async (req, res) => {
  const hashedtoken = crypto
    .createHash("sha256")
    .update(req.params.id)
    .digest("hex");
  console.log(hashedtoken);
  const users = await User.findOne({
    passwordresettoken: hashedtoken,
    passwordresetdate: { $gt: Date.now() },
  });
  console.log(users);
  if (!users) {
    console.log("url not valid");
    res.redirect("/");
  } else {
    if (req.body.password == req.body.passcode) {
      users.setPassword(req.body.password, function (err, user) {
        // it's done here, I can redirect
        console.log(user._id);
        if (err) {
          console.log(err);
        } else {
          User.findByIdAndUpdate(
            { _id: user._id },
            { hash: user.hash, salt: user.salt },
            (err, result) => {
              if (err) {
                console.log(err);
              } else {
                res.redirect("/");
              }
            }
          );
        }
      });
    } else {
      res.send("resetpass", {
        resettoken: "",
        errormsg: "password did not mached",
      });
    }
  }
};
