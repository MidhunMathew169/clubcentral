const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const wishlist = require("../../models/wishlistSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { session } = require("passport");
const { promise } = require("bcrypt/promises");
const { text } = require("stream/consumers");
const Wallet = require("../../models/walletSchema");
const { default: mongoose } = require("mongoose");
const Coupon = require("../../models/couponSchema");

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
    console.log('resend otp is triggered');
    try {
        const {email} = req.session.userData;
        console.log('email',email);
        if(!email){
            return res.status(400).json({success:false,message:"email not found in session"});
        }

        const otp = generateOtp();
        req.session.userOtp = otp;
        console.log('resend otp:',otp);

        const emailSent = await sendEmail(email,otp);
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
        console.log('otp from body',otp);
        //console.log(req.session.userData);
        if(req.session.userOtp.toString() === otp.toString()){
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                firstname:user.firstname,
                lastname:user.lastname,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            console.log('session user set to:',req.session.user);
            res.json({success:true,redirectUrl:"/",message:"user created successfully"});
            //res.render("user/home");
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

const loadHomepage = async(req,res)=>{
    try {
        console.log('home page triggered');
        const user = req.session.user;
        console.log('session:',req.session);
        //console.log('Session User:', req.session.user);
        console.log('user in teioweof:',user);
        
        const categories = await Category.find({isListed:true});
        let productData = await Product.find({
            isListed:true,
            category:{$in:categories.map(category=>category._id)},
            
        })
        //console.log('productData is:',productData)
        productData.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0,8);

        if(user){
            const userData = await User.findById(user);
        
            //console.log('User Data:', userData);
            res.render("user/home",{
                user:userData,
                isLoggedIn:true,
                productData:productData
            });

        }
        else{
            return res.render("user/home",{
                user:false,
                isLoggedIn:false,
                productData:productData
            });
        }
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
        console.log('findUser',findUser);
        console.log('findUser name:',findUser.firstname);
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
        req.session.user = findUser;
        console.log('userid is:',req.session.userId);
        console.log('req.session',req.session);

        await req.session.save((err)=>{
            if(err){
                return res.redirect('user/login');
            }
            res.redirect('/');
        })

    } 
    catch (error) {
        console.error("error in login:",error);
        res.render('user/login',{message:"login failed"});
    }
}

const forgotPassW = async (req,res) => {
    try {
        console.log('forgot pw page triggered');
        return res.render('user/forgot-password');
    } catch (error) {
        console.log('forgot password page is not found');
        res.status(500).send('server error');
    }
}

const logout = async (req,res) => {
    req.session.destroy((err) => {
        if(err){
            console.log("error during logout",err);
            return res.status(500).send("Error logging out.Please try again");
        }
        res.clearCookie('connect.sid', {path :'/'});
        res.redirect('/');
    });
};

const loadShoppingPage = async (req,res)=>{
    console.log('shop page triggered');
    try {
        const user = req.session.user;
        const sortOption = req.query.sort || 'featured';
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search || '';
        const categoryFilter = req.query.category || '';
        console.log('sortOption:',sortOption);
        console.log('searchQuery:',searchQuery);
        console.log('categoryFilter:',categoryFilter);

        //console.log('User in the session:',req.session.user)
        const userData = user ? await User.findOne({_id:user}) : null;
        const categories = await Category.find({isListed:true});
        console.log('categories:',categories);  
        const categoryIds = categories.map((category)=> category._id);
        const limit = 6;
        const skip = (page-1)*limit;

        let sortQuery = {};

        switch (sortOption){
            case "lowToHigh":
                sortQuery = {salePrice:1};
                break;
            case "highToLow":
                sortQuery = {salePrice:-1};
                break;
            case "aToZ":
                sortQuery = {productName:1};
                break;
            case "zToA":
                sortQuery = {productName:-1};
                break;
            default:
                sortQuery = { createdAt:-1};
                break;
        } 

        console.log('sortQuery:',sortQuery);

        
        let filterQuery = {
            isListed: true
        }
        console.log('filterQuery:',filterQuery);

        if(categoryFilter) {
            const selectedCategory = await Category.findOne({name:categoryFilter,isListed:true});

            if(selectedCategory){
                filterQuery.category = selectedCategory._id;
            }
        }
        else {
            filterQuery.category = { $in: categoryIds};
        }
        
        if (searchQuery) {
            filterQuery.productName = { $regex: searchQuery, $options: 'i'};
        }

        const productData = await Product.find(filterQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit);

        console.log('products in shop page:',productData);

        const totalProducts = await Product.countDocuments(filterQuery);
        const totalPages = Math.ceil(totalProducts/limit);
        const categoriesWithIds =  categories.map(category => ({_id:category._id,name:category.name}));

        res.render('user/shop',{
            user:userData,
            productData:productData,
            totalProducts:totalProducts,
            currentPage:page,
            totalPages:totalPages,
            sortOption:sortOption,
            searchQuery:searchQuery,
            category:categoriesWithIds,
            categoryFilter:categoryFilter,
        })
    } catch (error) {
        //res.redirect('/pageNotFound')
        console.log('shop page not found',error);
        res.status(500).send("server error");
    }
}

const searchProduct = async(req,res)=>{
    console.log('search product triggered');
    try {
        const user = req.session.user;
        const sortOption = req.query.sort || 'featured';
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search || '';
        const categoryFilter = req.query.category || '';

        console.log('sortOption:',sortOption);
        console.log('searchQuery:',searchQuery);
        console.log('categoryFilter:',categoryFilter);

        console.log('User in the session:',req.session.user);
        const userData = user ? await User.findOne({_id:user}) : null;
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map((category)=>category._id.toString());
        const limit = 6;
        const skip = (page-1)*limit;

        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const regex = searchQuery ? new RegExp(escapeRegex(searchQuery),'i') : null;

        const totalProducts = await Product.countDocuments({
            isListed:true,
            ...(regex && {productName:regex})
        })

        const productData = await Product.find({
            isListed:true,
            ...(regex && {productName:regex})
        }).sort({createdAt:-1}).skip(skip).limit(limit);

        const totalPages = Math.ceil(totalProducts/limit);
        const categoriesWithIds =  categories.map(category => ({_id:category._id,name:category.name}));

        res.render('user/shop',{
            user:userData,
            productData:productData,
            category:categoriesWithIds,
            totalProducts:totalProducts,
            currentPage:page,
            totalPages:totalPages,
            sortOption:sortOption,
            searchQuery:searchQuery,
            categoryFilter:categoryFilter
        })

    } catch (error) {
        console.error('Error searching product:',error);
        res.status(500).send('Error searching product');
    }
}

const loadUserProfile = async (req,res) => {
    console.log('profile page triggered');
    try {
        const user = req.session.user;
        console.log('User in the session:',req.session.user)
        const userData = await User.findOne({_id:user});
        if(!userData){
            return res.status(404).send('User not found');
        }
        console.log('User data from profile page:',userData);
        res.render('user/profile',{user:userData});
    } catch (error) {
        console.log('Error loading user profile:',error);
        res.status(500).send('Server error');
    }
}

const loadEditProfile = async(req,res)=>{
    console.log('edit profile page triggered');
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        if(!userData){
            console.log('user not in the session or user not find in db');
            return res.redirect('/login');
        }
        res.render('user/edit-profile',{user:userData});
    } catch (error) {
        console.log('error in edit profile page',error);
        res.status(500).send("server error");
    }
}

const editProfile = async(req,res)=>{
    console.log('edit profile triggered');
    try {
        const user = req.session.user;
        const {firstname,lastname,email,phone} = req.body;
        const userData = await User.findOne({_id:user});
        if(!userData){
            console.log('user not in the session or user not find in db');
            return res.status(400).send('User not found');
        }

        userData.firstname = firstname || userData.firstname;
        userData.lastname = lastname || userData.lastname;
        userData.email = email || userData.email;
        userData.phone = phone || userData.phone;

        await userData.save();
        console.log('user profile updated:',userData);
        return res.redirect('/userProfile');

    } catch (error) {
        console.log('error in edit profile',error);
        res.status(500).send('Server error');
    }
}

const loadChangePassword = async(req,res)=>{
    console.log('change password page triggered');
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        if(!userData){
            console.log('user not in the session');
            return res.redirect('/login');
        }
        res.render('user/change-password',{user:userData});
    } catch (error) {
        console.log('error in edit profile page',error);
        res.status(500).send('server error');
    }
}

const changePassword = async(req,res)=>{
    console.log('change password');
    try {
        const user = req.session.user;
        const {currentPassword,newPassword,confirmPassword} = req.body;
        const userData = await User.findOne({_id:user});

        if(!userData){
            console.log('user not in the session');
            return res.status(400).send('User not found');
        }

        const isMatch = await bcrypt.compare(currentPassword,userData.password);
        if(!isMatch){
            return res.status(404).send('incorrect password');
        }
        if(newPassword !== confirmPassword){
            return res.status(404).render('user/change-password',{user:userData,message:'Password does not match'});
        }
        const hashedPassword = await bcrypt.hash(newPassword,10);
        
        await User.findByIdAndUpdate(user,{password:hashedPassword},{runValidators:false});
        
        console.log('password changed');
        return res.redirect('/userProfile');
    } catch (error) {
        console.log('error in change password',error);
        res.status(500).send('server error');
    }
}

const loadAddressPage = async(req,res)=>{
    try {
        console.log('address page of user');
        const user = req.session.user;
        const addresses = await Address.find({userId:user._id});
        console.log('address is:',addresses);
        if(!user){
            return res.status(400).send('User not found');
        }
        res.render('user/my-address',{user,addresses});
    } catch (error) {
        console.log('error in address page',error);
        res.status(500).send("server error");
    }
}

const loadAddAddress = async(req,res)=>{
    try {
        console.log('load add address');
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        if(!userData){
            return res.status(400).send('User not found');
        }
        const redirect = req.query.redirect || null;

        res.render('user/add-address',{
            user: userData,
        redirectParam: redirect
    });
    } catch (error) {
        console.log('error in load add address',error);
        res.status(500).send("server error");
    }
}

const addAddress = async(req,res)=>{
    console.log('add address post');
    try {
        const user = req.session.user;
        const {firstName,lastName,resAddress,place,street,city,state,pincode,phone,altPhone} = req.body;

        const newAddress = new Address({
            userId : user,
            firstName,
            lastName,
            resAddress,
            place,
            street,
            city,
            state,
            pincode,
            phone,
            altPhone
        })
        await newAddress.save();
        const redirect = req.query.redirect;
        if(redirect === 'checkout'){
            return res.redirect('/checkout');
        }
        res.redirect('/addresses');
    } catch (error) {
        console.log('error in add address',error);
        res.status(500).send("server error");
    }
}

const editAddressPage = async(req,res)=>{
    console.log('edit address triggered');
    try {
        const user = req.session.user;
        const addressId = req.params.id;
        console.log('address id is:',addressId);
        const address = await Address.findById(addressId);
        console.log('user address:',address);
        if(!address){
            console.log('address not retrieved from db');
            return res.status(400).send('Address not found');
         }
         const redirect = req.query.redirect;
         res.render('user/edit-address',{
            user,
            address,
            redirectParam: redirect
         })
    } catch (error) {
        console.log('error in edit address',error);
        res.status(500).send("server error");
    }
}

const editAddress = async(req,res)=>{

    try {
        const user = req.session.user;
        const addressId = req.params.id;
        const {firstName,lastName,resAddress,place,street,city,state,pincode,phone,altPhone} = req.body;

        const updateAddress = await Address.findOneAndUpdate({"_id":addressId,"userId":user},{
            $set:{
            firstName,
            lastName,
            resAddress,
            place,
            street,
            city,
            state,
            pincode,
            phone,
            altPhone
        }},
        {new:true}
        );

        if(!updateAddress){
            console.log('address not updated in db');
            return res.status(400).json({message:'Address not updated'});
        }

        const redirect = req.query.redirect;
        if(redirect === 'checkout'){
            return res.redirect('/checkout');
        }
        res.redirect('/addresses');
    } catch (error) {
        console.log('error in edit address',error);
        res.status(500).json({message:"server error"});
    }
}

const deleteAddress = async(req,res)=>{
    try {
        const user = req.session.user;
        console.log('delete address post');
        const {addressId} = req.body;
        console.log('addressId',addressId);
        if(!addressId){
            return res.status(400).json({success:false,message:'Address id is required'});
        }

        const address = await Address.findOne({"_id":addressId,"userId":user});
        console.log('address',address);
        const updateAddress = await Address.findOneAndDelete(
            {"_id":addressId},
        );

        if(!updateAddress){
            return res.status(400).json({success:false,message:'Address not found'});
        }

        return res.json({success:true,message:'Address deleted successfully'})
    } catch (error) {
        console.log('error in delete address',error);
        res.status(500).json({success:false,message:"server error"});
    }
}

const loadCart = async(req,res)=>{
    try {
        console.log('load cart page triggered');
        const user = req.session.user;
        //const {productId,action} = req.body;

        const userData = user ? await User.findOne({_id:user}) : null;
        //console.log('user cart:',userData)
        if(!userData){
            return res.status(400).json({success:false,message:'User not found'});
        }

        const cart = await Cart.findOne({userId:user}).populate('items.productId');
        if(!cart || cart.items.length === 0){
            return res.render('user/cart',{items:[],total:0});
        }

        const cartItems = cart.items.map(item => ({
            id: item.productId._id,
            productImage: item.productId.productImage,
            productname: item.productId.productName,
            salePrice: item.productId.salePrice,
            size: item.size,
            quantity: item.quantity
        }));

        //calculate cart totals
        const cartTotal = cart.items.reduce((total,item) => {
            const product = item.productId;
            const productPrice = product.salePrice;
            const quantity = item.quantity;

            item.subtotal = productPrice * quantity;
            total += item.subtotal;
            return total;
        },0)

        res.render('user/cart',{user:userData,items:cartItems,total:cartTotal});
    } catch (error) {
        console.error(error);
        res.status(500).send('server error');
    }
}

const addToCart = async(req,res)=>{
    try {
        console.log('add to cart triggered');
        const userId = req.session.user;
        const {productId,size,quantity} = req.body;
        const userData = await User.findById(userId);
        if(!userData){
            return res.status(404).json({success:false,message:'please login to continue'});
        }
        console.log('add to cart quantity and product id:',quantity,size,productId);

        const product = await Product.findById(productId);
        if(!product){
            return res.status(400).json({success:false,message:'Product not found'});
        }

        const selectedSizeData = product.sizes.find(s => s.size === size);
        if(!selectedSizeData || selectedSizeData.quantity <= 0){
            return res.status(400).json({success:false,message:'Selected size is out of stock'});
        }

        let cart = await Cart.findOne({userId});
        if(!cart){
            cart = new Cart({userId: userId, items:[]});
        }

        const cartItem = cart.items.find(item => item.productId.toString() === productId && item.size === size);
        if(cartItem){
            cartItem.quantity += 1;
        }else{
            cart.items.push({productId,size, quantity:1,price:product.salePrice,totalPrice:product.salePrice});
        }
        await cart.save();
        res.json({success:true,message:'Product added to cart'});
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:'Internal server error'});
    }
}

const updateCartQty = async(req,res)=>{
    try {
        console.log('update cart qty triggered');
        const userId = req.session.user;
        const {productId,action,size} = req.body;
        console.log('Received request:', req.body);

        if(!productId || !action || !size){
            return res.status(400).json({
                success:false,
                message:'invalid request'
            });
        }

        const cart = await Cart.findOne({userId});
        if(!cart){
            return res.status(400).json({
                success:false,
                message:'Cart not found'
            });
        }

        const cartItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.size === size
        );

        if(cartItemIndex === -1){
            return res.status(404).json({
                success: false,
                message:'Product not found in cart'
            });
        }

        const product = await Product.findById(productId);
        const selectedSize = product.sizes.find(s => s.size === size);
        const maxQuantity = selectedSize ? selectedSize.quantity : 5;
        const purchaseLimit = Math.min(maxQuantity,6);

        if(action === 'increase'){
            cart.items[cartItemIndex].quantity = Math.min(cart.items[cartItemIndex].quantity + 1,purchaseLimit);
        }else if(action === 'decrease'){
            cart.items[cartItemIndex].quantity = Math.max(cart.items[cartItemIndex].quantity - 1,1);
        }

        cart.items[cartItemIndex].totalPrice = cart.items[cartItemIndex].price * cart.items[cartItemIndex].quantity;
        await cart.save();

        const cartTotal = cart.items.reduce((total,item) => total + item.totalPrice,0);
        res.json({
            success:true,
            purchaseLimit:purchaseLimit,
            quantity:cart.items[cartItemIndex].quantity,
            totalPrice:cart.items[cartItemIndex].totalPrice,
            cartTotal:cartTotal
        });
    } catch (error) {
        console.error('Error updating cart quantity:',error);
        res.status(500).json({
            success:false,
            message:'Error updating cart quantity'
        });
    }
}

const deleteCartItem = async(req,res)=>{
    try {
        console.log('delete cart item triggered');
        const {productId} = req.body;
        console.log('product id to delete:',productId);
        const userId = req.session.user;
        const cart = await Cart.findOne({userId});

        if(!cart){
            return res.status(400).json({success:false,message:'Cart not found'});
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

        const cartTotal = cart.items.reduce((total,item) => total + item.totalPrice,0);
        res.json({
            success:true,
            cartTotal:cartTotal
        });
     } catch (error) {
        console.error('Error deleting cart item:',error);
        res.status(500).json({
            success:false,
            message:'Error deleting cart item'
        });
    }
}

const loadCheckout = async(req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        if(!userData){
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({userId}).populate('items.productId');
        console.log('cart:',cart);
        const addresses = await Address.find({userId});
        console.log('address',addresses);
        if(!cart || !cart.items ||cart.items.length === 0){
            console.log('there is no item in the cart');
            return res.render('user/checkout',{
                message:'Cart is empty',
                user:userId,
                addresses:addresses,
                cart:cart || { items:[]},
                products:[],
                cartTotals:{total:0,discount:0,grandTotal:0}
            })
        }

        //calculate cart total
        const cartTotal = cart.items.reduce((total,item) => {
            const product = item.productId;
            const productPrice = product.salePrice;
            const quantity = item.quantity;

            item.subtotal = productPrice * quantity;
            total += item.subtotal;

            return total
        },0)
        
        const cartTotalObj = {
            total: cartTotal,
            deliveryCharge: cartTotal < 4000 ? 40 : 0,
            discountAmount: cartTotal.discountAmount  ? parseFloat(cart.discountAmount) : 0
        };

        cartTotalObj.finalTotal = cartTotalObj.total + cartTotalObj.deliveryCharge - cartTotalObj.discountAmount;
        console.log('cartTotal:', cartTotalObj);

        res.render('user/checkout',{
            user:userData,
            addresses:addresses,
            cart:cart,
            products:cart.items,
            cartTotals:cartTotalObj
        });
    } catch (error) {
        console.error('Error loading checkout page:',error);
        res.status(500).send('Error loading checkout page');
    }
}

const generateOrderId = () => {
    const timestamp = Date.now().toString().slice(-5);
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${timestamp}-${randomStr}`;
}

const generateTransactionId = () => {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');
    return `TXN-${timestamp}-${randomStr}`;
}

const placeOrder = async(req,res) => {
    try {
        console.log('place order triggered');
       const userId = req.session.user;
       const {selectedAddress, paymentOption} = req.body;
       const orderId = generateOrderId();

       console.log('req.body:',req.body);
       if(!selectedAddress || !paymentOption){
        return res.status(400).json({success: false, message: 'Address and payment method are required'});
       }
       
       const cart = await Cart.findOne({ userId }).populate('items.productId');
       console.log('cart:',cart);

       if(!cart || !cart.items || cart.items.length === 0){
        console.log('there is no item in the cart');
        return res.status(400).json({success: false, message: 'Cart is empty'});
       }

       let totalAmount = 0;
       const orderItems = await Promise.all(cart.items.map(async (item) => {
        const subtotal = item.productId.salePrice * item.quantity;
        totalAmount += subtotal;

        //
        const product = await Product.findById(item.productId._id);
        const sizeToUpdate = product.sizes.find(s => s.size === item.size);
        
        if (!sizeToUpdate || sizeToUpdate.quantity < item.quantity) {
            throw new Error(`Insufficient stock for size ${item.size} of product ${item.productId.productName}`);
        }

        // Reduce size-specific quantity
        sizeToUpdate.quantity -= item.quantity;

        product.stock = product.sizes.reduce((total, size) => total + size.quantity, 0);

        product.status = product.stock === 0 ? 'out of stock' : 'Available';

        await product.save();

        return {
            product: item.productId,
            quantity: item.quantity,
            size: item.size,
            price: item.productId.salePrice
        };
       }));
       
       const deliveryCharge = totalAmount < 4000 ? 40 : 0;
       
       let discount = 0;
       let couponApplied = null;

       if(cart.couponCode) {
        const coupon = await Coupon.findOne({code: cart.couponCode});
        if(coupon) {
            discount = cart.discountAmount || 0;
            couponApplied = coupon._id;
            
            //update coupon usage count for the user
            const userUsageIndex = coupon.userUsed.findIndex(u => u.userId.toString() === userId.toString());
            if(userUsageIndex >= 0) {
                coupon.userUsed[userUsageIndex].usageCount += 1;
            }else {
                coupon.userUsed.push({
                    userId: userId,
                    usageCount: 1
                });
            }

            await coupon.save();
        }
       }

       const finalTotal = totalAmount + deliveryCharge - discount;

       if(paymentOption === 'Wallet'){
        const wallet = await Wallet.findOne({userId:userId._id});
        if(!wallet){
            console.log('No wallet found');
            return res.status(400).json({success: false, error: 'No wallet found'});
        }
        if(!wallet || wallet.balance < finalTotal){
            console.log('Insufficient wallet balance');
            return res.status(400).json({success: false, error: 'Insufficient wallet balance'});
        }
        const txnId = generateTransactionId();
        wallet.balance -= finalTotal;
        wallet.transaction.push({
            transactionId: txnId,
            type:'debit',
            amount:finalTotal,
            description:`Payment for order ${orderId}`
        })
        await wallet.save();
       }

       const newOrder = new Order({
        userId:userId,
        orderId:orderId,
        items: orderItems,
        totalPrice:totalAmount,
        discount:discount,
        finalAmount: finalTotal,
        deliveryCharges: deliveryCharge,
        address: selectedAddress,
        paymentMethod: paymentOption,
        paymentStatus: 'Pending',
        status: 'Pending',
        orderDate: new Date(),
        couponApplied: couponApplied
       });

       await newOrder.save();
       
       await Cart.findOneAndDelete({userId});

       res.status(200).json({ success: true, message: 'Order placed successfully',finalTotal,orderId:newOrder._id});
    } catch (error) {
        console.log('error placing order',error);
        res.status(500).json({ success: false, message: 'Error placing order'});
    }
}

const pendingOrder = async(req,res) => {
    try {
        console.log('pending order triggered');
        const userId = req.session.user;
        const {amount,addressId} = req.body;
        console.log('req.body in pending order:',req.body);

        const cart = await Cart.findOne({userId}).populate('items.productId');

        if(!cart || cart.items.length === 0){
            return res.status(400).json({success:false,message:'Cart is empty'});
        }

        const address = await Address.findOne({_id:addressId});
        if(!address){
            return res.status(400).json({success:false,message:'Address not found'});
        }

        const orderItems = cart.items.map(item =>({
            product:item.productId,
            quantity:item.quantity,
            size:item.size,
            price:item.productId.salePrice,
            subtotal:item.productId.salePrice * item.quantity
        }));

        const deliveryCharge = amount < 5000 ? 40 : 0;

        const generateOid = generateOrderId();

        const order = new Order({
            userId:userId,
            orderId:generateOid,
            items:orderItems,
            totalPrice:amount,
            finalAmount:amount,
            deliveryCharges:deliveryCharge,
            address:address,
            paymentMethod:'Razorpay',
            paymentStatus:'Failed',
            status:'Pending',
            orderDate:new Date()
        });

        await order.save();

        return res.status(200).json({success:true,message:'pending order created successfully',orderId:order._id});

    } catch (error) {
        console.log('error in creating pending orders',error);
        return res.status(500).json({success:false,message:'Error creating pending order'});
    }
}

const listOrders = async(req,res) => {
    try {
        const userId = req.session.user;

        const currentPage = parseInt(req.query.page) || 1;

        const itemsPerPage = 5;

        const totalOrders = await Order.countDocuments({ userId});
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
        const skip = (currentPage - 1) * itemsPerPage;

        const orders = await Order.find({ userId}).populate('items.product')
        .sort({orderDate:-1})
        .skip(skip)
        .limit(itemsPerPage);
        console.log('orders are:',orders);
        res.render('user/orders',{orders,currentPage,totalPages});
    } catch (error) {
        console.error('Error listing orders:',error);
        res.status(500).send('Error listing orders');
    }
}

const cancelOrder = async(req,res)=>{
    try {
        console.log('cancelling order');
        const user = req.session.user;
        console.log('user is:',user);
        if(!user || !user._id){
            return res.status(400).json({success:false,message:'User not found'});
        }
        const txnId = generateTransactionId();
        const {orderId} = req.body;
        console.log('orderId is:',orderId);
        const order = await Order.findOne({_id:orderId});
        if(!order){
            return res.status(400).json({success:false,message:'Order not found'});
        }

        const wallet = await Wallet.findOne({userId:user._id});

        if(!wallet){
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
                transaction: []
            })
            await wallet.save();
        }

        const refundAmount = order.finalAmount;
        console.log('refundAmount:',refundAmount);

        if(order.paymentMethod !== 'COD' && order.paymentStatus === 'Paid'){
            wallet.balance += refundAmount;
            wallet.transaction.push({
                transactionId: txnId,
                type: 'credit',
                amount: refundAmount,
                description: `Refund for cancelled order ${order.orderId}`
            })
        }
        await Wallet.updateOne({userId:user._id},wallet);

        for(const item of order.items){
            const product = await Product.findById(item.product);
            console.log('cancelled product:',product);

            if(product){
                await Product.updateOne(
                    {_id:item.product,"sizes.size":item.size},
                    {$inc:{"sizes.$.quantity":item.quantity}}
                );
        }
    }
        const updateOrder = await Order.findOneAndUpdate(
            {_id:orderId},
            {$set:{status:'Cancelled',paymentStatus:'Refunded'}},
            {new:true}
        );
        if(!updateOrder){
            return res.status(400).json({success:false,message:'Order not found'});
        }
        res.status(200).json({success:true,message:'Order cancelled successfully',order:updateOrder});
    } catch (error) {
        console.log('error cancelling order',error);
        res.status(500).json({success:false,message:'Error cancelling order'});
    }
}

const returnOrder = async (req,res) => {
    try {
        console.log('returning order');
        const user = req.session.user;
        const {orderId} = req.body;

        const txnId = generateTransactionId();
        const order = await Order.findOne({_id:orderId});
        if(!order){
            return res.status(400).json({success:false,message:'Order not found'});
        }

        const wallet = await Wallet.findOne({userId:user._id});
        if(!wallet){
            return res.status(400).json({success:false,message:'Wallet not found'});
        }

        const refundAmount = order.finalAmount;
        console.log('refundAmount:',refundAmount);

        if(order.status === 'Delivered'){
            wallet.balance += refundAmount;
            wallet.transaction.push({
                transactionId: txnId,
                type: 'credit',
                amount: refundAmount,
                description: `Refund for returned order ${order.orderId}`
            })
        }
        await Wallet.updateOne({userId:user._id},wallet);

        const updateOrder = await Order.findOneAndUpdate(
            {_id:orderId},
            {$set:{status:'Cancelled',paymentStatus:'Refunded'}},
            {new:true}
        );
        if(!updateOrder){
            return res.status(400).json({success:false,message:'Order not found'});
        }
        return res.status(200).json({success:true,message:'Order returned successfully',order:updateOrder});
    } catch (error) {
        console.log('error returning order',error);
       return res.status(500).json({success:false,message:'Error returning order'});
    }
}

const orderDetails = async(req,res) => {
    try {
        console.log('order details is loaded');
        const userId = req.session.user;
        console.log('userId is:',userId);
        const orderId = req.params.id;
        console.log('orderId is:',orderId);

        const order = await Order.findOne({_id:orderId}).populate('address').populate('items.product');
        console.log('order is:',order);

        if(!order){
            console.log('order not found');
            return res.redirect('/orders');
        }

        res.render('user/order-details',{order,user:userId});

    } catch (error) {
        console.log('error in order details',error);
        res.status(500).send("server error");
    }
}

const pageNotFound = async(req,res)=>{
    try {
        //console.log('page not found is loaded');
       res.render('user/page-404'); 
    } catch (error) {
        //res.redirect('/pageNotFound')
        res.status(400).send("page not found")
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
    forgotPassW,
    logout,
    loadShoppingPage,
    searchProduct,
    loadUserProfile,
    loadEditProfile,
    editProfile,
    loadChangePassword,
    changePassword,
    loadAddressPage,
    loadAddAddress,
    addAddress,
    editAddressPage,
    editAddress,
    deleteAddress,
    loadCart,
    addToCart,
    updateCartQty,
    deleteCartItem,
    loadCheckout,
    placeOrder,
    pendingOrder,
    listOrders,
    cancelOrder,
    returnOrder,
    orderDetails,
    pageNotFound
}