const express = require("express");
const router = express.Router();

const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const passport = require("passport");

//signup management
router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup);
router.get('/otp_verify',userController.loadOtpPage);
router.post('/verify-otp',userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email'],prompt:'select_account'}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/');
});
//login management
router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/logout',userController.logout);

router.get('/',userController.loadHomepage);
router.get('/shop',userController.loadShoppingPage);
router.get('/productdetails/:id',productController.productDetail);

router.get('/pageNotFound',userController.pageNotFound);

module.exports = router;