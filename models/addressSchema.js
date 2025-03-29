const { name } = require("ejs");
const mongoose = require("mongoose");
const {Schema} = mongoose;


const addressSchema = new Schema ({
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
        firstName :{
            type : String,
            required : true
        },
        lastName : {
            type : String,
            required : true
        },
        resAddress : {
            type : String,
            required : true
        },
        place : {
            type : String,
            required : true
        },
        street : {
            type : String,
            required : true
        },
        city : {
            type : String,
            required : true
        },
        state : {
            type : String,
            required : true
        },
        pincode : {
            type : Number,
            required : true
        },
        phone : {
            type : String,
            required : true
        },
        altPhone : {
            type : String,
            required : true
        }
})

const Address = mongoose.model("Address",addressSchema);

module.exports = Address;