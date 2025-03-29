const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const { error } = require("console");

const getProductOffer = async (req,res)=>{
    console.log('show offer');
    try {
        console.log('productId:',req.params.productId);
        const productId = req.params.productId;
        const product = await Product.findById(productId);

        if(!product){
            return res.status(404).json({success:false,message:'Product not found'});
        }
        const offer = product.offer;
        return res.status(200).json({success:true,offer:product.offer || {}});
    } catch (error) {
        console.error('error fetching offer',error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

const addProductOffer = async (req,res)=>{
    console.log('adding offer for product');
    try {
        const {type,value,startDate,endDate} = req.body;
        const productId = req.params.productId;
        console.log('productId:',productId);
        console.log('offer data from frontend:',req.body);

        const product = await Product.findById(productId);

        if(!product){
            return res.status(404).json({success:false,message:'Product not found'});
        }
        let salePrice ;

        if(type === 'percentage'){
            salePrice = product.regularPrice * (1 - value/100)
        }
        else if(type === 'flat'){
            salePrice = product.regularPrice - value;
        }

        salePrice = salePrice > 0 ? salePrice : 0;

        console.log('Regular Price:',product.regularPrice,'Sale Price:',salePrice);

        product.offer = {
            type:type || 'percentage',
            value:parseFloat(value),
            startDate:startDate,
            endDate:endDate
        }
        product.salePrice = Math.round(salePrice);

        await product.save();
        console.log('updated product:',product);

        return res.status(200).json({success:true,message:'Offer added successfully',offer:product.offer})
    } catch (error) {
        console.error('error adding offer',error);
        return res.status(500).json({success:false,error:'Internal server error'})
    }
}

const editProductOffer = async (req,res)=>{
    console.log('editing offer for product');
    try {
        const {type,value,startDate,endDate} = req.body;
        const productId = req.params.productId;
        console.log('productId:',productId);
        console.log('offer data from frontend:',req.body);

        const product = await Product.findById(productId);

        if(!product){
            return res.status(404).json({success:false,error:'Product not found'});
        }

        if(!product.offer){
            return res.status(404).json({success:false,error:'Offer not found'});
        }

        let salePrice;

        if(type === 'percentage'){
            salePrice = product.regularPrice * (1 - value/100);
        }
        else if(type === 'flat'){
            salePrice = product.regularPrice - value;
        }

        salePrice = salePrice > 0 ? salePrice : 0;
        console.log('salePrice:',salePrice);

        product.offer.type = type || product.offer.type;
        product.offer.value = parseFloat(value) || product.offer.value;
        product.offer.startDate = startDate || product.offer.startDate;
        product.offer.endDate = endDate || product.offer.endDate;
        product.salePrice = Math.round(salePrice);

        await product.save();
        return res.status(200).json({success:true,message:'Offer edited successfully',offer:product.offer})

    } catch (error) {
        console.error('error editing offer',error);
        return res.status(500).json({success:false,error:'Internal server error'})
    }
}

const removeProductOffer = async (req,res)=>{
    console.log("removing offer for product");
    try {
        const productId = req.params.productId;

        const product = await Product.findById(productId);

        if(!product){
            return res.status(404).json({success:false,error:'Product not found'});
        }

        if(!product.offer){
            return res.status(404).json({success:false,error:'no active offer for this product'});
        }

        product.offer = null;
        product.salePrice = product.regularPrice;

        await product.save();
        return res.status(200).json({success:true,message:'Offer removed successfully',product})
    } catch (error) {
        console.error('error removing offer',error);
        return res.status(500).json({success:false,error:'Internal server error'})
    }
}

const getCategoryOffer = async (req,res)=>{
    console.log('show cat offer');
    try {
        console.log('categoryId:',req.params.categoryId);
        const categoryId = req.params.categoryId;
        console.log('categoryId 2:',categoryId);
        const category = await Category.findById(categoryId);
        console.log('category:',category);
        if(!category){
            return res.status(404).json({success:false,error:'Category not found'});
        }
        const offer = category.offer;
        return res.status(200).json({success:true,offer:category.offer || {}});
    } catch (error) {
        console.error('error fetching offer',error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

const addCategoryOffer = async (req,res)=>{
    console.log('adding offer for category');
    try {
        const catId = req.params.categoryId;
        console.log('catId:',catId);
        const {type,value,startDate,endDate} = req.body;
        console.log('offer data from frontend:',req.body);

        if(!catId){
            return res.status(404).json({success:false,error:'Category id is required'});
        }

        const category = await Category.findById(catId);
        console.log('category:',category);
        if(!category){
            return res.status(404).json({success:false,error:'Category not found'});
        }

        category.offer = {
            type:type || 'percentage',
            value:parseFloat(value),
            startDate:startDate,
            endDate:endDate
        }
        await category.save();

        const products = await Product.find({category:catId});
        console.log('products for this category:',products);
        if(!products || products.length === 0){
            return res.status(404).json({success:false,error:'No products found for this category'});
        }

        for(let product of products){
            let productOffer = product.offer?.value || 0;
            let productOfferType = product.offer?.type || 'percentage';
            let categoryOffer = value;
            let categoryOfferType = type || 'percentage';

            let finalOffer = 0;
            let finalOfferType = 'percentage';

            let productDiscountInPercentage = productOfferType === 'percentage' ? productOffer : (productOffer / product.regularPrice)*100;
            let categoryDiscountInPercentage = categoryOfferType === 'percentage' ? categoryOffer : (categoryOffer / product.regularPrice)*100;

            //take greater discount
            if(productDiscountInPercentage >= categoryDiscountInPercentage){
                finalOffer = productDiscountInPercentage;
                finalOfferType = productOfferType;
            }
            else{
                finalOffer = categoryDiscountInPercentage;
                finalOfferType = categoryOfferType;
            }

            //calculate new sale price
            let discountPrice = product.regularPrice;
                if(finalOfferType === 'percentage'){
                    discountPrice = product.regularPrice - (product.regularPrice * finalOffer/100);
                }
                else if(finalOfferType === 'flat'){
                    discountPrice = product.regularPrice - finalOffer;
                }
                product.salePrice = Math.max(Math.round(discountPrice),0);
            product.offer = {
                type:finalOfferType,
                value:finalOffer,
                startDate:startDate,
                endDate:endDate
            }
            await product.save();
        }
        return res.status(200).json({success:true,message:'Offer added successfully',offer:category.offer,products});
    } catch (error) {
        console.error('error adding offer',error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

const updateCategoryOffer = async (req,res)=>{
    console.log('editing offer for category');
    try {
        const catId = req.params.categoryId;
        console.log('catId:',catId);
        const {type,value,startDate,endDate} = req.body;

        if(!catId){
            return res.status(404).json({success:false,error:'Category id is required'});
        }

        const category = await Category.findById(catId);
        if(!category){
            return res.status(404).json({success:false,error:'Category not found'});
        }

        //updating only the provided field
        category.offer.type = type || category.offer.type;
        category.offer.value = parseFloat(value) || category.offer.value;
        category.offer.startDate = startDate || category.offer.startDate;
        category.offer.endDate = endDate || category.offer.endDate;

        await category.save();

        //update all product under this category
        const products = await Product.find({category:catId});
        console.log('products:',products);

        if(!products || products.length === 0){
            return res.status(404).json({success:false,error:'No products found for this category'});
        }

        for(let product of products){
            let productOffer = product.offer?.value || 0;
            let productOfferType = product.offer?.type || 'percentage';
            let categoryOffer = value !== undefined ? parseFloat(value) : productOffer;
            let categoryOfferType = type || productOfferType;

            let finalOffer = 0;
            let finalOfferType = 'percentage';

            let productDiscountInPercentage = productOfferType === 'percentage' ? productOffer : (productOffer / product.regularPrice)*100;
            let categoryDiscountInPercentage = categoryOfferType === 'percentage' ? categoryOffer : (categoryOffer / product.regularPrice)*100;

            //take greater discount
            if(productDiscountInPercentage >= categoryDiscountInPercentage){
                finalOffer = productDiscountInPercentage;
                finalOfferType = productOfferType;
            }
            else{
                finalOffer = categoryDiscountInPercentage;
                finalOfferType = categoryOfferType;
            }

            //calculate new sale price
            let discountPrice = product.regularPrice;
                if(finalOfferType === 'percentage'){
                    discountPrice = product.regularPrice - (product.regularPrice * finalOffer/100);
                }
                else if(finalOfferType === 'flat'){
                    discountPrice = product.regularPrice - finalOffer;
                }
                product.salePrice = Math.max(Math.round(discountPrice),0);
            product.offer = {
                type:finalOfferType,
                value:finalOffer,
                startDate:startDate || product.offer?.startDate,
                endDate:endDate || product.offer?.endDate
            }
            await product.save();
        }
        return res.status(200).json({success:true,message:'Offer updated successfully',offer:category.offer,products});
    } catch (error) {
        console.error('error updating offer',error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

const removeCategoryOffer = async (req,res)=>{
    console.log('removing offer for category');
    try {
        const catId = req.params.categoryId;

        const category = await Category.findById(catId);
        if(!category){
            return res.status(404).json({success:false,error:'Category not found'});
        }
        if(!category.offer){
            return res.status(404).json({success:false,error:'No offer found for this category'});
        }

        category.offer = null;
        await category.save();

        const products = await Product.find({category:catId});

        for(let product of products){
            let productOffer = product.offer?.value || 0;
            let productOfferType = product.offer?.type || 'percentage';
            let discountPrice = product.regularPrice;

            if(productOffer > 0){
                if(productOfferType === 'percentage'){
                    discountPrice = product.regularPrice - (product.regularPrice * productOffer/100);
                }
                else if(productOfferType === 'flat'){
                    discountPrice = product.regularPrice - productOffer;
                }
            }
            product.salePrice = Math.max(Math.round(discountPrice),0);
            await product.save();
        }
        return res.status(200).json({success:true,message:'Offer removed successfully',products});
    } catch (error) {
        console.error('error removing offer',error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

module.exports = {
    getProductOffer,
    addProductOffer,
    editProductOffer,
    removeProductOffer,
    getCategoryOffer,
    addCategoryOffer,
    updateCategoryOffer,
    removeCategoryOffer
}