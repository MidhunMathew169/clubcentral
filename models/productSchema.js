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
    sizes : [
        {
            size : {
                type : String,
                required : true
            },
            quantity : {
                type : Number,
                required : true,
                default : 0
            }
        }
    ],
    stock : {
        type : Number,
        required : true,
        default : 0
    },

    fitType : {
        type : String,
        required : true
    },
    sleeve : {
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
    offer : {
        type : {
            _id : mongoose.Schema.Types.ObjectId,
            type: String,
            enum: ['percentage', 'flat'],
            default:'percentage'
        },
        value : {
            type: Number,
            required: false
        },
        startDate : {
            type : Date,
            required : false
        },
        endDate : {
            type : Date,
            required : false
        }
    }
},{timestamps : true});


const Product = mongoose.model("Product",productSchema);

module.exports = Product;