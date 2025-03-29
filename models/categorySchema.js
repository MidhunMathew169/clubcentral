const { name } = require("ejs");
const mongoose = require("mongoose");
const {Schema} = mongoose;

const categorySchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    description : {
        type : String,
        required : true
    },
    isListed :{
        type : Boolean,
        default : true
    },
    isDeleted : {
        type : Boolean,
        default : false
    },
    offer : {
        type : {
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
    },
    createdAt : {
        type : Date,
        default : Date.now
    },
    productId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Product"
    }
})

const Category = mongoose.model("Category",categorySchema);

module.exports = Category;