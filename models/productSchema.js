const mongoose = require("mongoose");
const { type } = require("os");
const {Schema} = mongoose;

const productSchema = new Schema({
    productName : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    brand : {
        type : String,
        required : false
    },
    category : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Category",
        required : true
    },
    regularPrice : {
        type : Number,
        required : true
    },
    salePrice : {
        type : Number,
        required : true
    },
    productOffer : {
        type : Number,
        default : 0
    },
    // quantity : {
    //     type : Number,
    //     default : true
    // },
    sizes : [{
        size: {
            type: String,
            required : true
        },
        quantity: {
            type: Number,
            required : true,
            default : 0
        }
    }],
    fitType : {
        type : String,
        required : true
    },
    sleeve : {
        type : String,
        required : true
    },
    productImage : {
        type : [String],
        required : true
    },
    isListed : {
        type : Boolean,
        default : false
    },
    status :{
        type : String,
        enum : ["Available","out of stock","discontinued"],
        required : true,
        default : "Available"
    },
},{timestamps : true});


const Product = mongoose.model("Product",productSchema);

module.exports = Product;