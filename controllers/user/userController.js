const User = require("../../models/userSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const loadSignup = async(req,res)=>{
    try {
        return res.render('user/signup');
    } catch (error) {
        console.log("signup page is not found:",error);
        res.status(500).send("Server error");
    }
}

function generateOtp(){
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(email,otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            ports: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'OTP for signup',
            text: `Your OTP for signup is ${otp}`,
            html:`<b>Your OTP for signup is ${otp}</b>`
        })
        return info.accepted.length > 0;
        
    } catch (error) {
        console.error("error in sending email:",error);
        return false;
    }
}

const signup = async(req,res)=>{
  try {
    const {firstname,lastname,email,phone,password,cPassword} = req.body;
    if(password !== cPassword){
        return res.render("signup",{message:"password does not match"});
    }

    const findUser = await User.findOne({email});
    if(findUser){
        return res.render("signup",{message:"user already exists"});
    }

    const otp = generateOtp();
    const emailSent = await sendEmail(email,otp);
    if(!emailSent){
        return res.json("error in sending email");
    }
    req.session.userOtp = otp;
    req.session.userData = {firstname,lastname,email,phone,password};

    res.redirect('otp_verify');
    console.log("OTP sent:",otp);
  } catch (error) {
    console.error("error in signup:",error);
    res.redirect("/pageNotFound");
  }
}
const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.error("error in hashing password:",error);
    }
}

const resendOtp = async(req,res)=>{
    try {
        const {email} = req.session.userData;
        console.log(email,'email');
        if(!email){
            return res.status(400).json({success:false,message:"email not found in session"});
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendEmail(userData.email,otp);
        if(emailSent){
            req.session.userOtp = otp;
            console.log("OTP sent:",otp);
            res.status(200).json({success:true,message:"OTP Resend successfully"});
        }
        else{
            res.status(500).json({success:false,message:"failed to resend OTP"});
        }
    } catch (error) {
        console.error("error in resending otp:",error);
        res.status(500).json({success:false,message:"Internal server error"});
    }
}

const verifyOtp = async(req,res)=>{
    
    try {
        const {otp} = req.body;
        console.log(otp,'looooooooooooooooooooo');
        console.log(req.session.userData,'yyyy');
        if(req.session.userOtp.toString() === otp.toString()){
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                firstname:user.firstname,
                lastname:user.lastname,
                email:user.email,
                phone:user.Phone,
                password:passwordHash
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            //res.json({success:true,redirectUrl:"/",message:"user created successfully"});
            res.render("user/home");
        }
        else{
            res.status(400).json({success:false,message:"otp does not match"});
        }
    } catch (error) {
        console.error("error in verifying otp:",error);
        res.status(500).json({success:false,message:"server error"});
    }
    }

    const loadOtpPage = async(req,res)=>{
        try {
            console.log('otp page is loaded');
             res.render('user/otp_verify');
        } catch (error) {
            console.log('otp page not found');
            res.redirect("/pageNotFound");
        }
    }


const pageNotFound = async(req,res)=>{
    try {
        //console.log('page not found is loaded');
       res.render('user/page-404'); 
    } catch (error) {
        //res.redirect('/pageNotFound')
        res.status(400).send("page not found");
    }
}

const loadHomepage = async(req,res)=>{
    try {
        const user = req.session.user;
        console.log('Session User:', req.session.user);

        if(user){
            const userData = await User.findOne({_id:user._id});
            res.render("user/home",{user:userData});
            console.log('User Data:', userData);

        }
        else{
            return res.render("user/home");
        }
        // console.log('home page is loaded');
        // res.render("user/home");
    } catch (error) {
        console.log('home page not found');
        res.status(500).send("server error");
    }
}

const loadLogin = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render('user/login');
        }
        else{
            return res.redirect('/');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

const login = async(req,res)=>{
    try {
        const {email,password} = req.body;
        console.log('request-body',req.body);

        const findUser = await User.findOne({email});
        console.log('findUser',email);
        if(!findUser){
            return res.render('user/login',{message:"user not found"});
        }
        if(findUser.isBlocked){
            return res.render('user/login',{message:"user is blocked"});
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render('user/login',{message:"invalid email or password"});
        }
        req.session.userId = findUser._id;

        req.session.save((err)=>{
            if(err){
                return res.redirect('user/login');
            }
            res.render('user/home');
        })

    } 
    catch (error) {
        console.error("error in login:",error);
        res.render('user/login',{message:"login failed"});
    }
}
module.exports = {
    loadSignup,
    signup,
    loadOtpPage,
    verifyOtp,
    resendOtp,
    loadHomepage,
    loadLogin,
    login,
    pageNotFound,
}