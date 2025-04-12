const mongoose = require("mongoose");
const { type } = require("os");
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    items : [{
        productId : {
            type : Schema.Types.ObjectId,
            ref : "Product",
            required : true
        },
        quantity : {
            type : Number,
            default : 1
        },
        size : {
            type : String,
            required : true
        },
        price : {
            type : Number,
            required : true
        },
        totalPrice : {
            type : Number,
            required : true
        },
        offerPrice :{
            type : Number,
            default : 0
        },
        status : {
            type : String,
            default : 'placed'
        },
        cancellationReason : {
            type : String,
            default : "none"
        }
    }],
    totalAmount : {
        type : Number,
        default : 0
    },
    discountAmount : {
        type : Number,
        set : val => parseFloat(val) || 0,
        get : val => parseFloat(val) || 0
    },
    couponCode : {
        type : String,
        default : null
    },
});

const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart;