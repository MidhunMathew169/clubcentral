const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../controllers/user/userController");

const productDetail = async (req,res)=>{
    try {
        const userId = req.session.user;
        const categories = await Category.find({})
        const productId = req.params.id;
        const productData = await Product.findById(productId).populate('category')
        if(!productData){
            res.status(400).send({message:'Product not found'});
        }
        console.log('product data:',productData);
        const findCategory = productData.category;

        const relatedProducts = await Product.find({
            category:findCategory,
            _id:{$ne:productId}
        }).limit(4);

        res.render('user/product-details',{
            user:userId,
            productData:productData,
            relatedProducts:relatedProducts
        })
    } catch (error) {
        console.log('product details page is not found');
        res.status(500).send('Server error');
    }
}

module.exports = {
    productDetail
}