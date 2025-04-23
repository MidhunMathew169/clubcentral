const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const forgotController = require("../controllers/user/forgotController");
const addressController = require("../controllers/user/addressController");
const orderController = require("../controllers/user/orderController");
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
    req.session.user = req.user._id;
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
router.get('/addresses',userAuth,addressController.loadAddressPage);
router.get('/addAddress',userAuth,addressController.loadAddAddress);
router.post('/addAddress',userAuth,addressController.addAddress);
router.get('/editAddress/:id',userAuth,addressController.editAddressPage);
router.post('/editAddress/:id',userAuth,addressController.editAddress);
router.post('/deleteAddress',userAuth,addressController.deleteAddress);

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
router.get('/checkout',userAuth,orderController.loadCheckout);
router.post('/placeOrder',userAuth,orderController.placeOrder);
router.post('/create-pending-order',userAuth,orderController.pendingOrder);

//order management
router.get('/orders',userAuth,orderController.listOrders);
router.post('/cancelOrder',userAuth,orderController.cancelOrder);
router.post('/returnOrder',userAuth,orderController.returnOrder);
router.post('/cancelSingleItem',userAuth,orderController.cancelSingleItem);
router.post('/returnSingleItem',userAuth,orderController.returnSingleItem);
router.get('/orderDetails/:id',userAuth,orderController.orderDetails);

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
router.get('/wallet/filter',userAuth,wallet.filterWallet);
router.post('/create-transaction',userAuth,wallet.createTransaction);
router.post('/verify-transaction',userAuth,wallet.verifyTransaction);



router.get('/pageNotFound',userController.pageNotFound);
module.exports = router;