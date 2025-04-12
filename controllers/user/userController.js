const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { session } = require("passport");
const { promise } = require("bcrypt/promises");
const { text } = require("stream/consumers");
const Wallet = require("../../models/walletSchema");
const { default: mongoose } = require("mongoose");
//const { layout } = require("pdfkit/js/page");

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

        return res.render('user/shop',{
            user:userData,
            productData:productData,
            category:categoriesWithIds,
            totalProducts:totalProducts,
            currentPage:page,
            totalPages:totalPages,
            sortOption:sortOption,
            searchQuery:searchQuery,
            categoryFilter:categoryFilter
        });

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

const loadCart = async(req,res)=>{
    try {
        console.log('load cart page triggered');
        const user = req.session.user;
        //const {productId,action} = req.body;

        const userData = await User.findOne({_id:user});
        console.log('user cart:',userData);
        if(!userData){
            return res.status(400).json({success:false,message:'User not found'});
        }

        const cart = await Cart.findOne({userId:user}).populate('items.productId');
        if(!cart || cart.items.length === 0){
            return res.render('user/cart',{items:[],total:0,user:userData});
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

        res.render('user/cart',{ items:cartItems,total:cartTotal,user:userData });
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

        const maxQuantity = selectedSizeData.quantity;
        const purchaseLimit = Math.min(maxQuantity,5);

        let cart = await Cart.findOne({userId});
        if(!cart){
            cart = new Cart({userId: userId, items:[]});
        }

        const cartItem = cart.items.find(item => item.productId.toString() === productId && item.size === size);
        if(cartItem){
            if(cartItem.quantity >= purchaseLimit){
                return res.status(400).json({success:false,message:'Purchase limit exceeded'});
            }
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

// const updateCartQty = async(req,res)=>{
//     try {
//         console.log('update cart qty triggered');
//         const userId = req.session.user;
//         const {productId,action,size} = req.body;
//         console.log('Received request:', req.body);
// </ADDITIONAL_METADATA>
//     }
// }

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
        const purchaseLimit = Math.min(maxQuantity,5);

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
    loadCart,
    addToCart,
    updateCartQty,
    deleteCartItem,
    pageNotFound
}