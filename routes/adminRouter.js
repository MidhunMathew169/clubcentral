const express = require("express");
const router = express.Router();    
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const multer = require('multer');
const storage = require('../helpers/multer');
const uploads = multer({ storage: storage })
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
router.patch('/edit-category/:id',adminAuth,categoryController.editCategory);
router.patch('/toggle-category/:id',adminAuth,categoryController.listCategory);

//Product management
router.get("/products",adminAuth,productController.productInfo);
router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProduct);
router.patch("/toggle-product/:id",adminAuth,productController.listProduct);
router.get("/editProducts/:id",adminAuth,productController.getProductEditPage);
router.post("/editProducts/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);
module.exports = router;