const mongoose = require("mongoose");
const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const crypto = require('crypto');
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const loadWallet = async (req,res)=>{
    try {
        console.log('wallet page triggered');
        const user = req.session.user;

        const userData = await User.findOne({_id:user});
        console.log('userData from loadWallet:',userData);

        if(!userData){
            return res.redirect('/login');
        }

        let wallet = await Wallet.findOne({userId:user._id});
        console.log('wallet:',wallet);

        if(!wallet){
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
                transaction: []
            })
            await wallet.save();
        }
        console.log('wallet balance:',wallet.balance);

        res.render('user/wallet',{wallet,user:userData});
    } catch (error) {
        console.log('Error in loadWallet:',error);
        return res.status(500).send('Error loading wallet');
    }
}

const createTransaction = async (req,res)=>{
        console.log('createTransaction called');
        const {amount} = req.body;

        const user = req.session.user;
        const userData = await User.findOne({_id:user});

        if(!userData){
            console.log('User not Authenticated');
            return res.status(404).json({success:false,error:'User not Authenticated'});
        }

        if(!amount || amount <= 0){
            console.log('Invalid amount');
            return res.status(404).json({success:false,error:'Invalid amount,enter a positive valid number'});
        }

        const receipt = `wallet_${userData._id.toString().slice(-6)}_${Date.now().toString().slice(-6)}`

        const options = {
            amount : amount * 100,
            currency : "INR",
            receipt : receipt
        }

        try{
            const order = await razorpay.orders.create(options);
            res.json({
                key:process.env.RAZORPAY_KEY_ID,
                amount:order.amount,
                currency:order.currency,
                id:order.id
            });
        } catch (error) {
            console.log('Error in createTransaction:',error);
            return res.status(500).json({success:false,error:'Error in razorpay payment'});
        }
}

const verifyTransaction = async (req,res)=>{
    console.log('verifying razorpay payment');
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature,transactionId,amount} = req.body;
    console.log('received data:',req.body);

    const user = req.session.user;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    try {
        const generated_signature = crypto
        .createHmac('sha256',key_secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

        if(generated_signature !== razorpay_signature){
            return res.json({success:false, message:'Invalid signature'});
        }

        const wallet = await Wallet.findOne({userId:user._id});
        if(!wallet){
            return res.json({success:false, message:'Wallet not found'});
        }

        const amountInRupees = parseFloat(amount);

        wallet.balance += amountInRupees;
        wallet.transaction.push({
            transactionId: transactionId,
            type: 'credit',
            amount: amountInRupees,
            description: `${amountInRupees} added to wallet`
        });
        await wallet.save();

        return res.json({success:true, message:'Amount added to wallet successfully'});
    } catch (error) {
        console.log('Error in verifyTransaction:',error);
        return res.status(500).json({success:false, message:'Error in verifyTransaction'});
    }
}

module.exports = {
    loadWallet,
    createTransaction,
    verifyTransaction
}
