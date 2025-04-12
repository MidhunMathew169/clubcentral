const mongoose = require('mongoose');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const { error } = require('console');
const env = require('dotenv').config();

const showCoupons = async (req,res)=>{
    try {
        const user = req.session.user;
        const userData = user ? await User.findOne({_id:user}) : null;
        if(!userData){
            return res.redirect('/login');
        }

        const cartData = await Cart.findOne({userId:userData._id});
        console.log('Cart data is:',cartData)

        const coupon = await Coupon.find({});
        //console.log('Coupon data is:',coupon);

        const totalAmount = cartData.items.reduce((sum,item) => sum + (item.price * item.quantity),0);
        console.log('total amount:',totalAmount);

        const currentDate = new Date();
        console.log('Current date is:',currentDate);

        const availableCoupons = await Coupon.find({
            startedOn:{$lte:currentDate},
            expireOn:{$gte:currentDate},
            minPurchase:{$lte:totalAmount}
        });
        console.log('available coupons:',availableCoupons);

        if(availableCoupons.length === 0){
            console.log('No coupon available');
        }
        res.json({coupons:availableCoupons});

    } catch (error) {
        console.log('Error in showCoupons:',error);
        res.status(500).json({message:'Internal server error'});
    }
}

const applyCoupon = async (req,res)=>{
    try {
        const {couponCode,orderValue} = req.body;
        console.log('req.body:',req.body);
        const userId = req.session.user;
        if(!userId){
            return res.status(400).json({success:false,message:'login to apply coupon'});
        }

        const user = await User.findOne({_id:userId})
        const cart = await Cart.findOne({userId:user._id})

        if(!user){
            return res.status(400).json({success:false,message:'user not found'});
        }
        if(!cart){
            return res.status(400).json({success:false,message:'cart not found'});
        }

        //check if a coupon is already applied
        if(cart.couponCode){
            return res.status(400).json({success:false,error:'this coupon is already applied'});
        }

        const coupon = await Coupon.findOne({code:couponCode});

        if(!coupon){
            return res.status(400).json({success:false,message:'coupon not found'});
        }

        const currentDate = new Date();

        if(coupon.expireOn < currentDate){
            return res.status(400).json({success:false,error:'coupon has expired'});
        }

        if(orderValue < coupon.minPurchase){
            return res.status(400).json({success:false,error:`${coupon.minPurchase} is the minimum purchase required for this coupon`});
        }

        const previousOrder = await Order.findOne({userId: user._id, couponApplied: coupon._id});

        if(previousOrder) {
            return res.status(400).json({success:false,error: 'You have already used this coupon in a previous order'});
        }

        //find if user has used this coupon
        const userUsageIndex = coupon.userUsed.findIndex(us => us.userId.toString() === user._id.toString());
        let userUsage = userUsageIndex >= 0 ? coupon.userUsed[userUsageIndex] : null;

        //check if user has reached the limit for using this coupon
        if(userUsage && userUsage.usageCount >= coupon.userLimit){
            return res.status(400).json({success:false,error:'You have reached the limit for using this coupon'});
        }
        
        //calculate total discount
        let discount = 0;

        if(coupon.discountType === 'percentage'){
            discount = orderValue * (coupon.discount/100);
            console.log('discount percentage:',discount);
        }
        else if(coupon.discountType === 'fixed'){
            discount = coupon.discount;
        }

        if(discount > coupon.maxDiscount){
            discount = coupon.maxDiscount;
        }

        console.log('total discount amount:',discount);
        console.log('coupon discount:',coupon.discount);
        console.log('max discount:',coupon.maxDiscount);

        let remainingDiscount = discount;

        cart.items.forEach((item)=>{
            let productDiscount = 0;

            if(remainingDiscount > 0){
            if(coupon.discountType === 'percentage'){
                productDiscount = item.price * (coupon.discount/100);
            }
            else if(coupon.discountType === 'fixed'){
                productDiscount = coupon.discount/cart.items.length;
            }

            if(productDiscount > remainingDiscount) {
                productDiscount = remainingDiscount;
            }

            remainingDiscount -= productDiscount;
            
        }

            //Apply the discount to the item
            item.offerPrice = Math.max(item.price - productDiscount,0);
            console.log('item.offerPrice:',item.offerPrice);
        });

        //update cart total
        cart.totalAmount = cart.items.reduce((acc,item) => acc + (item.offerPrice * item.quantity),0);
        cart.discountAmount = cart.items.reduce((acc,item) => acc + (item.price - item.offerPrice) * item.quantity,0);
        cart.couponCode = couponCode;

        console.log('Total Cart Amount:',cart.totalAmount);
        console.log('Total discount amount:',cart.discountAmount);
        console.log('coupon code:',cart.couponCode);

        await cart.save();

        const finalPrice = orderValue - discount;

        console.log(`final price after discount:${finalPrice}`);
        console.log(`coupon ${couponCode} applied successfully,discount: ${discount}, final price ${finalPrice}`);

        return res.status(200).json({success:true,
            finalPrice,
            discount,
            message:'Coupon applied successfully',
            cart
        });

    } catch (error) {
        console.error('error in applying coupon:',error);
        res.status(500).json({message:'internal server error'});
    }
}

const removeCoupon = async(req,res) => {
    try {
        const {userId} = req.body;

        const user = await User.findOne({_id:userId});
        const cart = await Cart.findOne({userId:user._id});

        if(!cart.couponCode){
            res.status(400).json({message:'Coupon not found in the cart'});
        }

        //reset offer price to original price
        cart.items.forEach(item => {
            item.offerPrice = item.price;
        });

        cart.discountAmount = 0;

        cart.totalAmount = cart.items.reduce((acc,item) => acc + (item.price * item.quantity),0);

        cart.couponCode = null;
        await cart.save();

        return res.status(200).json({success:true,message:'Coupon removed successfully', newTotal : cart.totalAmount,discountAmount:0})
    } catch (error) {
        console.log('error removing coupon:',error);
        return res.status(500).json({success:false,message:'server error'});
    }
}

module.exports = {
    showCoupons,
    applyCoupon,
    removeCoupon
}