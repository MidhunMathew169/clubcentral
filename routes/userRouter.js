const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const forgotController = require("../controllers/user/forgotController");
const wishlistController = require("../controllers/user/wishlistController");
const couponController = require("../controllers/user/couponController");
const razorpay = require("../controllers/user/razorpay");
const wallet = require("../controllers/user/wallet");
const {sessionValidator, userAuth} = require("../middlewares/auth");
const passport = require("passport");
const Razorpay = require("razorpay");   
const Wallet = require("../models/walletSchema");

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

//forgot password
router.get('/forgotPassword',userController.forgotPassW);
router.post('/forgotPassword',forgotController.forgotPassword);
router.post('/resetCode',forgotController.codeVerification);
router.get('/verification',forgotController.verify)
router.get('/resetPass',forgotController.resetPassw);
router.post('/resetPassword',forgotController.resetPassword);

router.get('/',sessionValidator,userController.loadHomepage);
router.get('/shop',sessionValidator,userController.loadShoppingPage);
router.get('/productdetails/:id',sessionValidator,productController.productDetail);
router.get('/search',sessionValidator,userController.searchProduct);

//profile management
router.get('/userProfile',userAuth,userController.loadUserProfile);
router.get('/editProfile',userAuth,userController.loadEditProfile);
router.post('/editProfile',userAuth,userController.editProfile);

//password management
router.get('/changePassword',userAuth,userController.loadChangePassword);
router.post('/changePassword',userAuth,userController.changePassword);

//address management
router.get('/addresses',userAuth,userController.loadAddressPage);
router.get('/addAddress',userAuth,userController.loadAddAddress);
router.post('/addAddress',userAuth,userController.addAddress);
router.get('/editAddress/:id',userAuth,userController.editAddressPage);
router.post('/editAddress/:id',userAuth,userController.editAddress);
router.post('/deleteAddress',userAuth,userController.deleteAddress);

//wishlist management
router.get('/wishlist',userAuth,wishlistController.loadWishlist);
router.post('/addToWishlist',userAuth,wishlistController.addToWishlist);
router.post('/removeFromWishlist',userAuth,wishlistController.removeFromWishlist);

//cart management
router.get('/cart',userAuth,userController.loadCart);
router.post('/addToCart',userAuth,userController.addToCart);
router.post('/updateCartQty',userAuth,userController.updateCartQty);
router.post('/removeCartItem',userAuth,userController.deleteCartItem);

//checkout management
router.get('/checkout',userAuth,userController.loadCheckout);
router.post('/placeOrder',userAuth,userController.placeOrder);
router.post('/create-pending-order',userAuth,userController.pendingOrder);
router.get('/orders',userAuth,userController.listOrders);
router.post('/cancelOrder',userAuth,userController.cancelOrder);
router.post('/returnOrder',userAuth,userController.returnOrder);
router.get('/orderDetails/:id',userAuth,userController.orderDetails);

//coupon management
router.get('/coupons',userAuth,couponController.showCoupons);
router.post('/applyCoupon',userAuth,couponController.applyCoupon);
router.post('/deleteCoupon',userAuth,couponController.removeCoupon);

//payment management(razorpay)
router.post('/createOrder',userAuth,razorpay.createOrder);
router.post('/verifyPayment',userAuth,razorpay.verifyPayment);
router.post('/retryPayment',userAuth,razorpay.retryPayment);
router.post('/update-order-status',userAuth,razorpay.updateOrderStatus);

//wallet management
router.get('/wallet',userAuth,wallet.loadWallet);
router.post('/create-transaction',userAuth,wallet.createTransaction);
router.post('/verify-transaction',userAuth,wallet.verifyTransaction);



router.get('/pageNotFound',userController.pageNotFound);
module.exports = router;