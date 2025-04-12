const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const loadAddressPage = async(req,res)=>{
    try {
        console.log('address page of user');
        const user = req.session.user;
        const addresses = await Address.find({userId:user._id});
        console.log('address is:',addresses);
        if(!user){
            return res.status(400).send('User not found');
        }
        res.render('user/my-address',{user,addresses});
    } catch (error) {
        console.log('error in address page',error);
        res.status(500).send("server error");
    }
}

const loadAddAddress = async(req,res)=>{
    try {
        console.log('load add address');
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        if(!userData){
            return res.status(400).send('User not found');
        }
        const redirect = req.query.redirect || null;

        res.render('user/add-address',{
            user: userData,
        redirectParam: redirect
    });
    } catch (error) {
        console.log('error in load add address',error);
        res.status(500).send("server error");
    }
}

const addAddress = async(req,res)=>{
    console.log('add address post');
    try {
        const user = req.session.user;
        const {firstName,lastName,resAddress,place,street,city,state,pincode,phone,altPhone} = req.body;

        const newAddress = new Address({
            userId : user,
            firstName,
            lastName,
            resAddress,
            place,
            street,
            city,
            state,
            pincode,
            phone,
            altPhone
        })
        await newAddress.save();
        const redirect = req.query.redirect;
        if(redirect === 'checkout'){
            return res.redirect('/checkout');
        }
        res.redirect('/addresses');
    } catch (error) {
        console.log('error in add address',error);
        res.status(500).send("server error");
    }
}

const editAddressPage = async(req,res)=>{
    console.log('edit address triggered');
    try {
        const user = req.session.user;
        const addressId = req.params.id;
        console.log('address id is:',addressId);
        const address = await Address.findById(addressId);
        console.log('user address:',address);
        if(!address){
            console.log('address not retrieved from db');
            return res.status(400).send('Address not found');
         }
         const redirect = req.query.redirect;
         res.render('user/edit-address',{
            user,
            address,
            redirectParam: redirect
         })
    } catch (error) {
        console.log('error in edit address',error);
        res.status(500).send("server error");
    }
}

const editAddress = async(req,res)=>{

    try {
        const user = req.session.user;
        const addressId = req.params.id;
        const {firstName,lastName,resAddress,place,street,city,state,pincode,phone,altPhone} = req.body;

        const updateAddress = await Address.findOneAndUpdate({"_id":addressId,"userId":user},{
            $set:{
            firstName,
            lastName,
            resAddress,
            place,
            street,
            city,
            state,
            pincode,
            phone,
            altPhone
        }},
        {new:true}
        );

        if(!updateAddress){
            console.log('address not updated in db');
            return res.status(400).json({message:'Address not updated'});
        }

        const redirect = req.query.redirect;
        if(redirect === 'checkout'){
            return res.redirect('/checkout');
        }
        res.redirect('/addresses');
    } catch (error) {
        console.log('error in edit address',error);
        res.status(500).json({message:"server error"});
    }
}

const deleteAddress = async(req,res)=>{
    try {
        const user = req.session.user;
        console.log('delete address post');
        const {addressId} = req.body;
        console.log('addressId',addressId);
        if(!addressId){
            return res.status(400).json({success:false,message:'Address id is required'});
        }

        const address = await Address.findOne({"_id":addressId,"userId":user});
        console.log('address',address);
        const updateAddress = await Address.findOneAndDelete(
            {"_id":addressId},
        );

        if(!updateAddress){
            return res.status(400).json({success:false,message:'Address not found'});
        }

        return res.json({success:true,message:'Address deleted successfully'})
    } catch (error) {
        console.log('error in delete address',error);
        res.status(500).json({success:false,message:"server error"});
    }
}

module.exports = {
    loadAddressPage,
    loadAddAddress,
    addAddress,
    editAddressPage,
    editAddress,
    deleteAddress
}