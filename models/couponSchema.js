const mongoose = require("mongoose");
const { type } = require("os");
const {Schema} = mongoose;

const couponSchema = new mongoose.Schema({
    couponName : {
        type : String,
        required : true
    },
    code : {
        type : String,
        required : true,
        unique : true
    },
    description : {
        type : String,
        required : false
    },
    minPurchase : {
        type : Number,
        required : true
    },
    limit : {
        type : Number,
        required : true,
        min: 1
    },
    userLimit : {
        type : Number,
        required : true,
        default: 1
    },
    userUsed : [{
        userId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        usageCount: {
            type : Number,
            default : 0
        } 
    }],
    startedOn : {
        type : Date,
        required : true
    },
    expireOn : {
        type : Date,
        required : true
    },
    discountType : {
        type : String,
        enum : ['percentage','fixed'],
        required : true
    },
    discount : {
        type : Number,
        required : true
    },
    maxDiscount : {
        type : Number,
        required: true
    }
})

const Coupon = mongoose.model("Coupon",couponSchema);
module.exports = Coupon;