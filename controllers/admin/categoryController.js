const Category = require("../../models/categorySchema");
//const category = require("../../models/categorySchema");

const categoryInfo = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const totalCategories = await Category.countDocuments({isDeleted:false});
        const categoryData = await Category
        .find({isDeleted:false})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);
        console.log(categoryData);
        
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('admin/category',{
            categories : categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            limit: limit,
            hasNextPage : page < totalPages,
            hasPrevPage : page > 1,
            nextPage : page + 1,
            prevPage : page - 1
        })
    } catch (error) {
        console.error(error);
        res.send('Error in getting category data');
    }
}

const addCategory = async (req,res)=>{
    const {name,description} = req.body;
    const trimmedName = name.trim();
    if(!name || !description){
        return res.status(400).json({success:false,error:'All fields are required'});
    }
    try {
        const existingCategory = await Category.findOne({name:{$regex:`^${trimmedName}$`,$options:'i'}});
        if(existingCategory){
            console.log("work");
            return res.status(400).json({success:false,error:'Category already exists'});
        }
        const newCategory = new Category({name,description});
        await newCategory.save();
        return res.status(201).json({success:true,message:'Category added successfully'});
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

const editCategory = async (req,res)=>{
    console.log('editCategory')
    try {
        const categoryId = req.params.id;
        console.log(categoryId)
        const {name,description} = req.body;
        const trimmedName = name.trim();
        const existingCategory = await Category.findOne({name:{$regex:`^${trimmedName}$`,$options:'i'}});

        if(existingCategory){
            return res.status(400).json({success:false,error:'Category exists.Please choose another name'});
        }
        const UpdateCategory = await Category.findByIdAndUpdate(categoryId,{
            name :name,
            description : description
        },{new:true});
        
        if(!UpdateCategory){
            return res.status(400).json({success:false,error:'Category not found'});
        }
        return res.status(200).json({success:true,message:'Category updated successfully'});
    } catch (error) {
        console.error(error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

const listCategory = async (req,res) =>{
    console.log('listCategory');
    try {
        const categoryId = req.params.id;
        console.log(categoryId);
        console.log('req.body:',req.body);
        let {isListed} = req.body;
        isListed = isListed === "true" || isListed === true;

        const category = await Category.findByIdAndUpdate(categoryId , {isListed} , {new:true});

        if(!category){
            return res.status(404).json({message: "category not found"});
        }
        res.json({success:true, message: "category status updated",category});
    } catch (error) {
        console.error("Error updating category status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    editCategory,
    listCategory
}