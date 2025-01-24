const { data } = require("jquery");
const User = require("../models/userSchema");
const { error } = require("console");

const userAuth = async(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user._id)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect('/login');
            }
        })
        .catch(error=>{
            console.error('error in userAuth middleware');
            res.status(500).send("server error");
        })
    }
    else{
        res.redirect('/login');
    }
}

const adminAuth = async(req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }
        else{
            res.redirect('/admin/login');   
        }
    })
    .catch(error=>{
        console.log('error in adminAuth middleware');
        res.status(500).send("Internal server error");
    })
}

// const isAuthenticated = async(req,res,next)=>{
//     if(!req.session.isAdmin){
//         res.redirect('/admin/login');
//     }
//     else{
//         next();
//     }
// }

module.exports = {
    userAuth,
    adminAuth,
   // isAuthenticated
};