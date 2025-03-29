const mongoose = require("mongoose");
const {Schema} = mongoose;
//const {v4:uuidv4} = require('uuid');

const orderSchema = new Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    orderId : {
        type : String,
        unique : true,
        required : true
    },
    items : [{
        product : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Product',
            required : true
        },
        quantity : {
            type : Number,
            required : true
        },
        size : {
            type : String,
            required : true
        },
        price : {
            type : Number,
            required : true
        }
    }],
    totalPrice : {
        type : Number,
        required : true
    },
    discount : {
        type : Number,
        default : 0
    },
    finalAmount : {
        type : Number,
        required : true
    },
    deliveryCharges : {
        type : Number,
        default : 0
    },
    address : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Address",
        required : true
    },
    paymentMethod : {
        type : String,
        required : true
    },
    paymentStatus : {
        type : String,
        enum : ['Pending','Paid','Failed','Refunded'],
        default : 'Pending'
    },
    status : {
        type : String,
        enum : ['Pending','Processing','Shipped','Delivered','Cancelled'],
        default : 'Pending'
    },
    orderDate : {
        type : Date,
        default : Date.now,
        required : true
    },
    couponApplied : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Coupon'
    },
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String
})

const Order = mongoose.model("Order",orderSchema);
module.exports = Order;