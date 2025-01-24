const express = require("express");
const router = express.Router();    
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const {adminAuth} = require("../middlewares/auth");

//login management
router.get('/pageerror',adminController.pageError);
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/dashboard',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

//user management
router.get('/users',adminAuth,customerController.customerInfo);
router.post('/block-user/:id',adminAuth,customerController.blockUser);
router.post('/unblock-user/:id',adminAuth,customerController.UnBlockUser);

//category management
router.get('/categories',adminAuth,categoryController.categoryInfo);
router.post('/add-category',adminAuth,categoryController.addCategory);
router.put('/edit-category/:id',adminAuth,categoryController.editCategory);

module.exports = router;