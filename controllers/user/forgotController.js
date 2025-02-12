const User = require("../../models/userSchema");
//const {generateOtp} = require("../../controllers/user/userController");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const env = require("dotenv").config();
const nodemailer = require('nodemailer');


const forgotPassword = async (req,res)=>{
    try {
        const {email} = req.body;

        const user = await User.findOne({email});
        console.log('user document:',user);

        if(!user){
            return res.render('user/forgot-password',{message:'user not found'});
        }

        const resetOtp = () =>{
            return crypto.randomInt(100000,999999).toString();
        };

        const otp = resetOtp();
        const expireIn = Date.now() + 30 * 60 * 1000;

        req.session.resetCode = otp;
        req.session.resetCodeExpires = expireIn;
        req.session.userEmail = email;

        const transport = nodemailer.createTransport({
            service:"gmail",
            ports: 587,
            secure: false,
            requireTLS:true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            },
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: user.email,
            subject: "reset password OTP",
            text: `Your password reset code is: ${otp}\n\n
                   This code will expire in 1 hour. If you did not request this, please ignore this email`,
        };

        await transport.sendMail(mailOptions);
        console.log(`OTP sent successfully to ${email} : ${otp}`);

        res.render('user/verification',{message:'OTP sent successfully'});

    } catch (error) {
        console.log("error while email verification",error);
        res.status(500).send('server error');
    }
}

const codeVerification = async (req,res)=>{
    try {
        console.log('code verification page triggered');
        const {resetCode} = req.body;
        console.log('req.body:',req.body)

        if(req.session.resetCode !== resetCode ||
            Date.now() > req.session.resetCodeExpires
        ){
            console.log('error in verifying code')
            return res.redirect('/verification')
        }
        res.redirect('/resetPass')
    } catch (error) {
        console.error("Error during code verification:", error);
        return res.status(500).send("server issue occurred.");
    }
}

const verify = async (req,res)=>{
    try {
        res.render('user/verification');
    } catch (error) {
        res.status(500).send('server error');
    }
}

const  resetPassw = async (req,res)=>{
    console.log('reset password page');
    try{
        res.render('user/reset-Passw');
    }catch (error){
        console.log(error)
        return res.status(500).send('oops server error')

    }
}

const resetPassword = async (req,res)=>{
    try {
        const {password,confirmPassword} = req.body;
        if (!password || !confirmPassword) {
            return res.status(400).send("Both fields are required.");
          }
          if (password !== confirmPassword) {
            return res.status(400).send("Passwords does not match.");
          }
          const userEmail = req.session.userEmail;
          if(!req.session.resetCode || Date.now() > req.session.resetCodeExpires){
            res.status(404).send("password reset session has expired");
          }

          const user = await User.findOne({email:userEmail});

          if(!user){
            return res.status(404).send("user not found");
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          user.password = hashedPassword;
          await user.save();

          req.session.resetCode = null;
          req.session.resetCodeExpires = null;
          req.session.userEmail = null;

          res.redirect("/login");

    } catch (error) {
        console.error("Error while resetting password:", error);
        return res.status(500).send("Oops! Server error occurred.");
    }
}

module.exports = {
    forgotPassword,
    codeVerification,
    verify,
    resetPassw,
    resetPassword
}