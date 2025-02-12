// const product = require("../../models/productSchema");
// const category = require("../../models/categorySchema");

const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const fs = require("fs");
const path = require("path");
const Sharp = require("sharp");
const { error } = require("console");
const { name } = require("ejs");

const productInfo = async(req,res)=>{
    try {
        const search =  req.query.search || "";
        const page = parseInt(req.query.page) || 1 ;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const productData = await Product.find({productName:{$regex:new RegExp(".*"+search+".*","i")}})
        .limit(limit*1)
        .skip(skip)
        .populate('category')
        .exec();

        const count = await Product.find({productName:{$regex:new RegExp(".*"+search+".*","i")}}).countDocuments();
        const category = await Category.find({isListed:true});
        
        if(category){
            res.render("admin/products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category
            })
        }
        else{
            console.log('error in rendering');
        }
     } catch (error) {
        console.log(error)
    }
}
const getProductAddPage = async(req,res)=>{
    try {
        const category = await Category.find({isListed:true});
        res.render("admin/product-add",{
            cat:category,
        });
    } catch (error) {
        
    }
}
const addProduct = async(req,res)=>{
    try {
        console.log('adding products in progress');

        const {productName,description,regularPrice,salePrice,category,fitType,sleeve} = req.body;
        console.log(req.body);
        console.log("sales price from req.body",salePrice);
        

        const productExist = await Product.findOne({ productName });
        if(productExist){
            return res.json({success:false ,error:'product already exist'});
        }

        const uploadImages = [];
        if(req.files && req.files.length > 0){
            for(let i = 0; i < req.files.length; i++){
                //const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join('public','uploads','re-images',req.files[i].filename);
                const resizedFilename = Date.now() + req.files[i].filename;
                const rePath = path.join('public','uploads','re-images',resizedFilename);

                const supportedFormats = ['image/jpeg','image/png','image/jpg'];
                if(!supportedFormats.includes(req.files[i].mimetype)){
                    return res.json({success:false ,error:'unsupported image format'})
                }

                try {
                    await Sharp(resizedImagePath)
                    .resize({ width: 440, height: 440})
                    .toFile(rePath);
                } catch (sharpError) {
                    console.log('Error processing image with Sharp:', sharpError);
                    return res.json({success:false ,error:'Error proccessing image'});
                }

                uploadImages.push(resizedFilename);
            }
        }

        const categoryData = await Category.findById(category);
        if(!categoryData){
            return res.status(404).json({success:false ,error:'category not found'});
        }

        //process sizes and quantities
        const sizes = [
            { size: 'S', quantity: Number(req.body.sizeS) || 0},
            { size: 'M', quantity: Number(req.body.sizeM) || 0 },
            { size: 'L', quantity: Number(req.body.sizeL) || 0 },
            { size: 'XL', quantity: Number(req.body.sizeXL) || 0 },
            { size: 'XXL', quantity: Number(req.body.sizeXXL) || 0 }
        ]
        let sizeQuantitiesArray = sizes.filter(item => item.quantity > 0);
        console.log(sizeQuantitiesArray);

        const newProduct = new Product({
            productName,
            description,
            productImage: uploadImages,
            category: categoryData?._id,
            regularPrice,
            salePrice,
            fitType,
            sleeve,
            sizes: sizeQuantitiesArray,
        });

        await newProduct.save();
        //return res.redirect('/admin/products');
        return res.json({success: true ,message:"Product Added Successfully" })
    } 
    catch (error) {
        console.log('Error saving products',error);
        return res.json({success:false , error : "An error occurred while saving the product"})
    }
};

const getProductEditPage = async (req,res) => {
    console.log('edit product');
    try {
        const productId = req.params.id;
        console.log(productId);
        const product = await Product.findById(productId);
        console.log(product);
        const category = await Category.find();
        res.render("admin/product-edit",{
            product:product,
            categories:category
        })
    } catch (error) {
        console.log(error);
    }

}

const editProduct = async (req,res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id);

        if(!product){
            return res.status(404).send({message:"product not found"});
        }

        const {productName,description,regularPrice,salePrice,category,fitType,sleeve} = req.body;
        console.log(req.body);

    
        const sizes = [
            { size: 'S', quantity: Number(req.body.sizeS) || 0 },
            { size: 'M', quantity: Number(req.body.sizeM) || 0 },
            { size: 'L', quantity: Number(req.body.sizeL) || 0 },
            { size: 'XL', quantity: Number(req.body.sizeXL) || 0 },
            { size: 'XXL', quantity: Number(req.body.sizeXXL) || 0 }
        ];

        // Merge new sizes with existing sizes
        let updatedSizes = product.sizes.map(existingSize => {
            let newSize = sizes.find(sizeObj => sizeObj.size === existingSize.size);
            return newSize ? newSize : existingSize; // Keep existing if not updated
        });

        // Handle new size additions
        sizes.forEach(newSize => {
            if (!updatedSizes.some(existingSize => existingSize.size === newSize.size)) {
                updatedSizes.push(newSize);
            }
        });

        console.log('updated sizes:',updatedSizes);

        //handle image uploads
        const removedImages = req.body.removedImages ? req.body.removedImages : [];

        product.productImage = product.productImage.filter(img => !removedImages.includes(img));
        const uploadImages = [];
        if(req.files && req.files.length > 0){
            for(let i = 0; i < req.files.length; i++){
                const resizedFilename = Date.now() + req.files[i].filename;
                const rePath = path.join('public','uploads','re-images',resizedFilename);
                try {
                    await Sharp(req.files[i].path)
                    .resize({ width: 440, height: 440})
                    .toFile(rePath);
                } catch (sharpError) {
                    console.log('Error processing image with Sharp:', sharpError);
                    return res.status(500).json({error:'Error proccessing image'});
                }
                uploadImages.push(resizedFilename);
            }
        }
        // const existingImages = product.productImage || [];
        // const updatedImages = uploadImages.length > 0 ? [...existingImages, ...uploadImages] : existingImages;
        for(let i = 0; i < removedImages.length; i++) {
            if (uploadImages[i]){
                product.productImage[i] = uploadImages[i];
            }
        }
        //update product with new value
        product.productName = productName;
        product.description = description;
        product.regularPrice = regularPrice;
        product.salePrice = salePrice;
        product.category = category || product.category;
        product.fitType = fitType || product.fitType;
        product.sleeve = sleeve || product.sleeve;
        product.sizes = updatedSizes;
        // if(updatedImages.length > 0){
        //     product.productImage = updatedImages;
        // }

        await product.save();
        return res.redirect('/admin/products');

    } catch (error) {
        console.error('Error in updating product:',error);
        return res.status(500).send({ message: 'Internal server error' });
    }
};

const deleteSingleImage = async (req,res) => {
    try {
        const {imageNameToServer,productIdToServer} = req.body;
        console.log('req.boy:',req.body);
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}},{new:true});
        const imagePath = path.join('public','uploads','re-images',imageNameToServer);

        if(fs.existsSync(imagePath)){
           await fs.unlinkSync(imagePath);
           console.log(`image ${imageNameToServer} deleted successfully`);
        }
        else{
            console.log(`image ${imageNameToServer} not found in the files`);
        }
        res.send({status:true});
    } catch (error) {
        console.log('error while deleteing image');
        res.json({success:false,message:'error while deleting image'});
    }
}

const listProduct = async (req, res) => {
    console.log('listProduct');
    try {
        const productId = req.params.id;
        console.log(productId);
        console.log('req.body:',req.body);
        let { isListed } = req.body;

        isListed = isListed === "true" || isListed === true; 

        const product = await Product.findByIdAndUpdate(productId, { isListed }, { new: true });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, message: "Product status updated", product });
    } catch (error) {
        console.error("Error updating product status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


module.exports = {
    productInfo,
    getProductAddPage,
    addProduct,
    getProductEditPage,
    editProduct,
    deleteSingleImage,
    listProduct
}