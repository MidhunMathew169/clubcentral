const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const env = require("dotenv").config();
const Razorpay = require("razorpay");
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const createOrder = async (req,res) => {
        console.log('createOrder called');
        const {amount,orderId} = req.body;

        const options = {
            amount : amount * 100,
            currency : "INR",
            receipt : `receipt_${orderId}`

        };

    try{
        const order = await razorpay.orders.create(options);
        res.json({
            key: process.env.RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            id: order.id
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}

const verifyPayment = async (req,res) => {
    console.log('verifying razorpay payment');
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature,orderId} = req.body;
    console.log('received data:',req.body);

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    try {
        const generated_signature = crypto
        .createHmac('sha256',key_secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

        if(generated_signature !== razorpay_signature){
            const order = await Order.findById(orderId);
            if(order){
                order.paymentStatus = 'Failed';
                order.razorpay_order_id = razorpay_order_id;
                order.razorpay_payment_id = razorpay_payment_id;
                order.razorpay_signature = razorpay_signature;
                await order.save();
            }
            return res.json({success:false, message:'Invalid signature'});
        }

        //find and update the order
        const order = await Order.findById(orderId);

        if(!order){
            return res.json({success:'false', message:'Order not found'});
        }

        //update order with payment details
        order.razorpay_order_id = razorpay_order_id;
        order.razorpay_payment_id = razorpay_payment_id;
        order.razorpay_signature = razorpay_signature;
        order.paymentStatus = 'Paid';
        order.status = 'Processing';
        await order.save();

        //clear user's cart
        const user = await User.findById(order.userId);
        if(user){
            await Cart.findOneAndDelete({userId:user._id});
        }

        res.json({status:'success', message:'Payment Verified Successfully'});

    } catch (error) {
        console.error('Error verifying payment:',error);

        try {
            const order = await Order.findById(orderId);
            if (order) {
                order.paymentStatus = 'Failed';
                order.razorpay_order_id = razorpay_order_id;
                order.razorpay_payment_id = razorpay_payment_id;
                order.razorpay_signature = razorpay_signature;
                await order.save();
            }
        } catch (error) {
            console.error('error updating order status',error);        
        }
        res.status(500).json({status:'failed',message:'Failed to verify payment'});
    }
}

const retryPayment = async (req,res) => {
    try {
        const {orderId,amount} = req.body;
        console.log('req body in retrypayment:',req.body);

        const order = await Order.findById(orderId);
        if(!order){
            return res.status(404).json({success:false, message:'Order not found'});
        }

        const razorpayOrder = await razorpay.orders.create({
            amount : amount * 100,
            currency : "INR",
            receipt : `retry_${orderId}`
        });
        console.log('created new order:',razorpayOrder);

        order.razorpay_order_id = razorpayOrder.id;
        order.paymentStatus = 'Pending';
        await order.save();

        return res.status(200).json({
            success:true,
            key:process.env.RAZORPAY_KEY_ID,
            amount:razorpayOrder.amount,
            order:razorpayOrder
        })
    } catch (error) {
        console.error('Error retrying payment:',error);
        return res.status(500).json({success:false, message:'Error retrying payment'});
    }
}

const updateOrderStatus = async (req,res) => {
    try {
        const {orderId,paymentStatus,status} = req.body;

        const order = await Order.findById(orderId);

        if(!order){
            return res.status(404).json({success:false, message:'Order not found'});
        }
        order.paymentStatus = paymentStatus;
        await order.save();

        return res.status(200).json({success:true, message:'Order status updated successfully'});
    } catch (error) {
        console.error('Error updating order status:',error);
        return res.status(500).json({success:false, message:'Error updating order status'});
    }
}

module.exports = {
    createOrder,
    verifyPayment,
    retryPayment,
    updateOrderStatus
}
