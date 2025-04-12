const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const { get } = require("jquery");

const loadCoupons = async (req,res)=>{
    try {
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 6;

        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / itemsPerPage);
        const skip = (currentPage - 1) * itemsPerPage;

        const coupons = await Coupon.find()
        .sort({startedOn:1})
        .skip(skip)
        .limit(itemsPerPage);

        console.log('coupons are:',coupons);
        res.render('admin/coupon',{coupons,currentPage,totalPages});
    } catch (error) {
        console.error('error in loading coupons:',error);
        res.status(500).send('Internal server error');
    }
}

const getCouponAddPage = async (req,res) => {
    console.log('get coupon add page triggered');
    try {
        res.render("admin/coupon-add");
    } catch (error) {
        console.error('error in getting coupon add page:',error);
        res.status(500).send('Internal server error');
    }
}

const addCoupon = async (req,res)=>{
        // const formatDate = (dateStr) => {
        //     const [day, month, year] = dateStr.split('-');
        //     return new Date(`${year}-${month}-${day}`);
        // }
        let {couponName,code,minPurchase,limit,userLimit,startedOn,expireOn,discount,maxDiscount,discountType,description} = req.body;
        console.log('req.body:',req.body);

        startedOn = new Date(startedOn);
        expireOn = new Date(expireOn);

        const codeTester = code.trim();
        console.log('add coupon triggered');
    try {
        const existingCoupon = await Coupon.findOne({code:{ $regex: `^${codeTester}$`, $options: 'i' }});
        if(existingCoupon){
            return res.status(400).json({success:false,error:'Coupon already exists'});
        }
        
        const newCoupon = new Coupon({couponName,code,minPurchase,limit,userLimit,startedOn,expireOn,discount,maxDiscount,discountType,description});
        await newCoupon.save();
        res.status(201).json({success:true,message:'Coupon added successfully'});

    } catch (error) {
        console.error('error in adding coupon:',error);
        res.status(500).send('Internal server error');
    }
}

const couponEditPage = async (req,res)=>{
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById({_id:couponId});
        console.log('coupon:',coupon);
        res.render('admin/coupon-edit',{coupon});
    } catch (error) {
        console.error('error in getting coupon edit page:',error);
        res.status(500).send('Internal server error');
    }
}

const editCoupon = async (req,res)=>{
    try {
        const couponId = req.params.id;
        let {code,minPurchase,limit,userLimit,startedOn,expireOn,discount,maxDiscount,discountType,description} = req.body;
        console.log('req.body:',req.body);

        if(!couponId){
            console.log('coupon not found');
            return res.status(400).json({success:false,error:'Coupon not found'});
        }

        startedOn = new Date(startedOn);
        expireOn = new Date(expireOn);

        const updateCoupon = await Coupon.findOneAndUpdate({_id:couponId},
            {$set:
                {code,minPurchase,limit,userLimit,startedOn,expireOn,discount,maxDiscount,discountType,description}
            },
            {new:true}
        );

        if(!updateCoupon){
            console.log('coupon not updated');
            return res.status(400).json({success:false,error:'Coupon not updated'});
        }

        res.status(200).json({success:true,message:'coupon Updated successfully',coupon:updateCoupon});
    } catch (error) {
        console.error('error in editing coupon:',error);
        res.status(500).send('Internal server error');
    }
}

const deleteCoupon = async(req,res)=>{
    try {
        console.log('deleting coupon details');
        const {couponId} = req.body;
        console.log('couponId is:',couponId);

        const deletedAddress = await Coupon.findOneAndDelete({"_id":couponId});

        if(!deletedAddress){
            return res.status(400).json({success:false,message:'Coupon not found'});
        }

        return res.json({success:true,message:'coupon deleted successfully'});
    } catch (error) {
        console.error('error in deleting address',error);
        res.status(500).json({success:false,message:'internal server error'});
    }
}

module.exports = {
    loadCoupons,
    getCouponAddPage,
    addCoupon,
    couponEditPage,
    editCoupon,
    deleteCoupon
}