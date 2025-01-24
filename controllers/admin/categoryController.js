const category = require("../../models/categorySchema");

const categoryInfo = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const startIndex = (page - 1);
        
        const categoryData = await category.find({isDeleted:false})
        .sort({createdAt:-1})
        .skip(startIndex)
        .limit(limit);
        console.log(categoryData);
        

        const totalCategories = await category.countDocuments({isDeleted:false});
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('admin/category',{
            categories : categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            limit: limit
        })
    } catch (error) {
        console.error(error);
        res.send('Error in getting category data');
    }
}

const addCategory = async (req,res)=>{
    const {name,description,offer} = req.body;
    if(!name || !description){
        return res.status(400).json({success:false,error:'All fields are required'});
    }
    try {
        const existingCategory = await category.findOne({name});
        if(existingCategory){
            console.log("work");
            return res.status(400).json({success:false,error:'Category already exists'});
        }
        const newCategory = new category({name,description,offer});
        await newCategory.save();
        return res.status(201).json({success:true,message:'Category added successfully'});
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({success:false,error:'Internal server error'});
    }
}

const editCategory = async (req,res)=>{
    try {
        const categoryId = req.params.id;
        const {name,description,offer} = req.body;
        const existingCategory = await category.findOne({name});

        if(existingCategory){
            return res.status(400).json({success:false,error:'Category exists.Please choose another name'});
        }
        const UpdateCategory = await category.findByIdAndUpdate(categoryId,{
            name :name,
            description : description,
            offer : offer
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

module.exports = {
    categoryInfo,
    addCategory,
    editCategory
}