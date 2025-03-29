const mongoose = require("mongoose");
const { type } = require("os");
const {Schema} = mongoose;

const walletSchema = new Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    balance : {
        type : Number,
        required : true,
        default : 0
    },
    transaction : [{
        transactionId : {
            type : String,
            required : true
        },
        type : {
            type : String,
            required : false
        },
        amount : {
            type : Number,
            required : true
        },
        date : {
            type : Date,
            default : Date.now
        },
        description : {
            type : String,
            required : false
        }
    }]
})

const Wallet = mongoose.model("Wallet",walletSchema);

module.exports = Wallet;