const express = require("express");
const router = express.Router();    
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const offerController = require("../controllers/admin/offerController");
const couponController = require("../controllers/admin/couponController");
const salesController = require("../controllers/admin/salesReport");
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

//order management
router.get("/orders",adminAuth,orderController.listOrders);
router.get("/orderInfo/:id",adminAuth,orderController.orderInfo);
router.patch("/updateStatus",adminAuth,orderController.updateStatus);
router.patch("/cancelOrder",adminAuth,orderController.cancelOrder);

//offer management
router.get("/showOffer/:productId",adminAuth,offerController.getProductOffer);
router.post("/addOffer/:productId",adminAuth,offerController.addProductOffer);
router.patch("/editOffer/:productId",adminAuth,offerController.editProductOffer);
router.post("/removeOffer/:productId",adminAuth,offerController.removeProductOffer);
router.get("/showCategoryOffer/:categoryId",adminAuth,offerController.getCategoryOffer);
router.post("/addCategoryOffer/:categoryId",adminAuth,offerController.addCategoryOffer);
router.patch("/editCategoryOffer/:categoryId",adminAuth,offerController.updateCategoryOffer);
router.post("/removeCategoryOffer/:categoryId",adminAuth,offerController.removeCategoryOffer);

//coupon management
router.get("/coupons",adminAuth,couponController.loadCoupons);
router.get("/addCoupon",adminAuth,couponController.getCouponAddPage);
router.post("/addCoupon",adminAuth,couponController.addCoupon);
router.get("/editCoupon/:id",adminAuth,couponController.couponEditPage);
router.patch("/editCoupon/:id",adminAuth,couponController.editCoupon);
router.post("/deleteCoupon",adminAuth,couponController.deleteCoupon);

//sales report
router.get("/sales-report",adminAuth,salesController.salesReport);
router.get("/export-sales-report",adminAuth,salesController.exportSalesReportToExcel);
router.get("/export-sales-report-pdf",adminAuth,salesController.exportSalesReportToPDF);
module.exports = router;