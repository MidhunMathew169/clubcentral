const admin = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const e = require("express");

const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/login');
    }
    res.render('admin/login',{message:'Login failed'});
}

const login = async(req,res)=>{
    try {
        const {email,password} = req.body;
        const findAdmin = await admin.findOne({email,isAdmin:true});
        if(findAdmin){
            const passMatch = await bcrypt.compare(password,findAdmin.password);
            if(passMatch){
                req.session.admin = true;
                return res.render('admin/dashboard');
            }
            else{
                return res.render('/admin/login',{message:'Invalid email or password'});
            }
        }
        else{
            return res.render('/admin/login',{message:'User not found'});
        }
       
    } catch (error) {
        console.error('error in login:',error);
        res.render('/admin/login',{message:'login failed'});
    }
}

const loadDashboard = (req,res)=>{
    if(req.session.admin){
        try {
             res.render('admin/dashboard',{'activeTab':'dashboard'});
        } catch (error) {
            res.redirect('/admin/login');
        }
    }
  
}

const pageError = (req,res)=>{
    res.render('admin/pageerror');
}

const logout = (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log('error in destroying session');
                res.redirect('/admin/pageerror');
            }
            res.redirect('/admin/login');
        });
    } catch (error) {
        console.log('unexpected error in logout');
        res.redirect('/admin/pageerror');
    }
}
module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}