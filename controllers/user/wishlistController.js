const mongoose = require("mongoose");
const app = require("../../app");
const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const env = require("dotenv").config();

const loadWishlist = async (req,res)=>{
    try {
        console.log("wishlist page logged in");
        const user = req.session.user;

        const userData = user ? await User.findOne({_id:user}) : null;
        console.log('userData:',userData);
        if(!userData){
            res.redirect('/login');
        }
        const wishlist = await Wishlist.findOne({userId:user}).populate('products');
        console.log('wishlist:',wishlist);

        if(!wishlist || wishlist.products.length === 0){
            return res.render('user/wishlist',{
                message:"No products in wishlist",
                products:[],
                user:userData,
                });
        }

        res.render('user/wishlist',{
            products:wishlist.products,
            user:userData,
        });

    } catch (error) {
        console.error('Error in loadWishlist:',error);
        return res.status(500).send('error occured while adding to wishlist');
    }
}

const addToWishlist = async (req,res)=>{
    try {
        console.log("adding product to wishlist");
        const {productId} = req.body;
        console.log('productId:',productId);
        const user = req.session.user;
        const userId = await User.findById(user);
        const product = await Product.findOne({_id:productId});
        console.log('product:',product);

        let wishlist = await Wishlist.findOne({userId});
        if(!wishlist){
            wishlist = new Wishlist({
                userId,
                products:[]
            })
        }
        if(wishlist.products.includes(productId)){
            return res.status(400).json({success:false,message:'Product already in wishlist'});
        }
        wishlist.products.push(product);
        await wishlist.save();
        console.log('wishlist:',wishlist);
        return res.status(200).json({success:true,message:'Product added to wishlist'});
    } catch (error) {
        console.error('Error in addToWishlist:',error);
        return res.status(500).send('error occured while adding to wishlist');
    }
}

const removeFromWishlist = async (req,res)=>{
    try {
        console.log("removing product from wishlist");
        const {productId} = req.body;
        console.log('productId:',productId);
        const userId = req.session.user;

        const wishlist = await Wishlist.findOne({userId});
        console.log('wishlist:',wishlist);
        if(!wishlist){
            return res.status(400).json({success:false,message:'No products in wishlist'});
        }

        wishlist.products = wishlist.products.filter(product => product.toString() !== productId);
        await wishlist.save();
        res.status(200).json({success:true,message:'Product removed from wishlist'});
    } catch (error) {
        console.error('Error in removeFromWishlist:',error);
        return res.status(500).send('error occured while adding to wishlist');
    }
}

module.exports = {
    loadWishlist,
    addToWishlist,
    removeFromWishlist
}