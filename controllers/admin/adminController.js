const admin = require("../../models/userSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
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
                return res.redirect('/admin/dashboard');
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

const loadDashboard = async (req,res)=>{
    if(req.session.admin){
        try {
            const users = await User.countDocuments({isAdmin:false});
            const products = await Product.countDocuments();
            const orders = await Order.countDocuments();
            const revenue = await Order.aggregate([
                {$match: { status: {$in:['Delivered'] } } },
                {$group: {_id:null, total: {$sum: '$finalAmount'} } }
            ]);
            console.log('revenue:',revenue);

            const bestSellingProducts = await Order.aggregate([
                {$match: { status: {$in:['Delivered'] } } },
                {$unwind: '$items'},
                {$group: {
                    _id: '$items.product',
                    totalSales:{$sum:'$items.quantity'},
                    price: {$first: '$items.price'}
                }},
                {$sort: {totalSales: -1}},
                {$limit: 5},
                {$lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }},
                {$unwind: '$product'},
                {$lookup:{
                    from:'categories',
                    localField:'product.category',
                    foreignField:'_id',
                    as:'category'
                }},
                {$unwind: '$category'},
                {$project:{
                    productName: '$product.productName',
                    category: '$category.name',
                    productImage: '$product.productImage',
                    status: '$product.status',
                    price: {$round:['$price',0]},
                    totalSales: 1
                }}
            ]);

            const topCategory = await Order.aggregate([
                {$match: { status: {$in: ['Delivered'] } } },
                {$unwind: '$items'},
                { $lookup:{
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'product'
                }},
                {$unwind: '$product'},
                {$lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }},
                {$unwind: '$category'},
                { $group:{
                    _id: {id: '$category._id', name: '$category.name'},
                    sales: {$sum: '$items.quantity'},
                    totalRevenue: {$sum: {$multiply: ['$items.quantity', '$items.price']}}
                }},
                {$sort: {sales: -1}},
                {$limit: 3},

                {$lookup: {
                    from: 'products',
                    let: { categoryId: '$_id.id' },
                    pipeline: [
                        { $match: { $expr: {$eq: ['$category', '$$categoryId']}}},
                        { $count: 'productCount'}
                    ],
                    as: 'productInfo'
                }},
                {$addFields: {
                    productCount: {$ifNull: [{$arrayElemAt:['$productInfo.productCount',0]},0]}
                }},
                {$project: {
                    _id: 0,
                    name: '$_id.name',
                    sales: 1,
                    totalRevenue: 1,
                    productCount: 1
                }
                }
            ]);
            console.log('top category:',topCategory);

            res.render('admin/dashboard',{
                users,
                products,
                orders,
                revenue: revenue[0]?.total || 0,
                bestSellingProducts,
                bestCategories: topCategory || null,
                bestCategorySales: topCategory[0]?.sales || 0
            })

        } catch (error) {
            console.error("error in dashboard:",error);
            res.render('admin/pageerror');
        }
    }
  
}

const loadDashboardData = async (req,res)=>{
    try {
        const filter = req.query.filter || 'all';
        console.log('filter:',req.query.filter);
        console.log('request from frontend:',filter);
        const now = new Date();
        const currentYear = now.getFullYear();
        let periodFilter = {};
        let revenueLabels = [];
        let ordersLabels = [];
        let revenueData = [];
        let ordersData = [];

        const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

        const deliveredOrders = await Order.countDocuments({status:'Delivered'});
        console.log('delivered orders:',deliveredOrders);

        const orderStatuses = ['Delivered'];

        if(filter === "weekly"){
            const lastWeekStart = new Date(now);
            // const dayOfWeek = now.getDay();
            // const diff = dayOfWeek === 0 ? 6 : dayOfWeek -1;
            lastWeekStart.setDate(now.getDate() - 6);
            lastWeekStart.setHours(0,0,0,0);

            const lastWeekEnd = new Date(now);
            lastWeekEnd.setHours(23,59,59,999);

            periodFilter = {
                orderDate: {
                    $gte: lastWeekStart,
                    $lte: lastWeekEnd
                }
            };

            console.log('Date range:', lastWeekStart,'to',lastWeekEnd);

            revenueLabels = [];
            for(let i = 6; i >= 0; i--){
                const day = new Date(now);
                day.setDate(now.getDate() - i);
                revenueLabels.push(daysOfWeek[day.getDay()]);
            }
            ordersLabels = [...revenueLabels];

            revenueData = Array(7).fill(0);
            ordersData = Array(7).fill(0);

            const ordersInLastWeek = await Order.countDocuments({...periodFilter,status: {$in: ['Delivered']}});
            console.log('orders in last week:',ordersInLastWeek);

            const weeklyData = await Order.aggregate([
                {$match: {status: {$in: ['Delivered']},...periodFilter} },
                {
                    $addFields: {
                        dayOfWeek: {$dayOfWeek: '$orderDate'},
                        dayDiff: {
                            $floor: {
                                $divide: [
                                    { $subtract: [now, '$orderDate'] },
                                    1000 * 60 * 60 * 24
                                ]
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$dayOfWeek",
                        revenue: { $sum: "$finalAmount" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id": 1 }
                }
            ]);

            console.log('weekly data from DB:',weeklyData);

            weeklyData.forEach(item =>{
                const dayOfWeek = item._id;
                const dayIndex = revenueLabels.findIndex(day => day === daysOfWeek[dayOfWeek - 1]);

                if(dayIndex !== -1) {
                    revenueData[dayIndex] = item.revenue;
                    ordersData[dayIndex] = item.count;
                }
            });

        }else if(filter === 'monthly'){
            const startOfMonth = new Date(currentYear,now.getMonth(),1);
            const endOfMonth = new Date(currentYear,now.getMonth() + 1, 0, 23, 59, 59, 999);

            periodFilter = {
                orderDate: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            };

            const totalDays = endOfMonth.getDate();
            const numWeeks = Math.ceil(totalDays / 7);

            revenueLabels = [];
            for(let i = 0; i < numWeeks; i++){
                const weekStart = i * 7 + 1;
                const weekEnd = Math.min((i + 1) * 7,totalDays);
                revenueLabels.push(`Week ${i + 1} (${weekStart} - ${weekEnd})`);
            }
            console.log('revenueLabels of monthly:',revenueLabels);

            ordersLabels = [...revenueLabels];
            revenueData = Array(numWeeks).fill(0);
            ordersData = Array(numWeeks).fill(0);

            const monthlyData = await Order.aggregate([
                {$match: { status: { $in:['Delivered']},...periodFilter}},
                {
                    $project: {
                        week: {
                            $ceil: {
                                $divide: [
                                    { $dayOfMonth: '$orderDate' },
                                    7
                                ]
                            }
                        },
                        finalAmount: 1
                    }
                },
                {
                    $group: {
                        _id: '$week',
                        revenue: { $sum: '$finalAmount'},
                        count: { $sum: 1}
                    }
                },
                {
                    $sort: { "_id": 1}
                }
            ]);

            console.log('monthly data from DB:',monthlyData);

            monthlyData.forEach(item => {
                const weekIndex = item._id - 1;
                if(weekIndex >= 0 && weekIndex < numWeeks) {
                    revenueData[weekIndex] = item.revenue;
                    ordersData[weekIndex] = item.count;
                }
            });
        }else if(filter === 'yearly'){
            const startOfYear = new Date(currentYear,0,1);
            const endOfYear = new Date(currentYear,11,31,23,59,59);

            periodFilter = {
                orderDate: {
                    $gte: startOfYear,
                    $lte: endOfYear
                }
            };

            revenueLabels = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            ordersLabels = [...revenueLabels];

            const yearlyData = await Order.aggregate([
                {$match: {status: {$in: ['Delivered']},...periodFilter}},
                {
                    $group: {
                        _id: { month: { $month: '$orderDate'}},
                        revenue: { $sum: '$finalAmount'},
                        count: { $sum: 1}
                    }
                },
                {
                    $sort: {"_id.month": 1}
                }
            ]);

            revenueData = Array(12).fill(0);
            ordersData = Array(12).fill(0);

            yearlyData.forEach(item => {
                const monthIndex = item._id.month - 1;
                revenueData[monthIndex] = item.revenue;
                ordersData[monthIndex] = item.count;
            });
        }

        //debug: Check a few orders to verify date fields
        const sampleOrders = await Order.find({status: 'Delivered'}).sort({orderDate: -1}).limit(3);
        console.log('Sample delivered orders:',
            sampleOrders.map(order => ({
                id: order.orderId,
                date: order.orderDate,
                amount: order.finalAmount
            }))
        );

        const matchStage = { $match: {status: {$in: ['Delivered']},...periodFilter}};
        
        //dummy data for testing
        // if (revenueData.every(val => val === 0)){
        //     console.log('No revenue data found, adding sample data for testing');

        //     revenueData = revenueData.map((_ , i)=> Math.floor(Math.random() * 10000) + 1000);
        //     ordersData = ordersData.map((_ , i)=> Math.floor(Math.random() * 10) + 1);
        // }

        const bestSellingProducts = await Order.aggregate([
            matchStage,
            { $unwind: "$items"},
            { $group:{
                _id: "$items.product",
                totalSales: {$sum: "$items.quantity"},
                price: { $first: "$items.price"}
            }},
            {$sort: {totalSales: -1}},
            {$limit: 5},
            {$lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product'
            }},
            {$unwind: '$product'},
            {$lookup:{
                from:'categories',
                localField:'product.category',
                foreignField:'_id',
                as:'category'
            }},
            {$unwind: '$category'},
            {$project:{
                productName: '$product.productName',
                category: '$category.name',
                productImage: '$product.productImage',
                status: '$product.status',
                price: {$round:['$price',0]},
                totalSales: 1
            }}
        ]);

        const summary = await Order.aggregate([
            { $match: { status: { $in: ['Delivered'] } } },
            { $group: { 
                _id: null, 
                totalRevenue: { $sum: '$finalAmount' }, 
                totalOrders: { $sum: 1 } 
            }}
        ]);

        const topCategory = await Order.aggregate([
            matchStage,
            {$unwind: '$items'},
            { $lookup:{
                from: 'products',
                localField: 'items.product',
                foreignField: '_id',
                as: 'product'
            }},
            {$unwind: '$product'},
            {$lookup: {
                from: 'categories',
                localField: 'product.category',
                foreignField: '_id',
                as: 'category'
            }},
            {$unwind: '$category'},
            { $group:{
                _id: {id: '$category._id', name: '$category.name'},
                sales: {$sum: '$items.quantity'},
                totalRevenue: {$sum: {$multiply: ['$items.quantity', '$items.price']}}
            }},
            {$sort: {sales: -1}},
            {$limit: 3},

            {$lookup: {
                from: 'products',
                let: { categoryId: '$_id.id' },
                pipeline: [
                    { $match: { $expr: {$eq: ['$category', '$$categoryId']}}},
                    { $count: 'productCount'}
                ],
                as: 'productInfo'
            }},
            {$addFields: {
                productCount: {$ifNull: [{$arrayElemAt:['$productInfo.productCount',0]},0]}
            }},
            {$project: {
                _id: 0,
                name: '$_id.name',
                sales: 1,
                totalRevenue: 1,
                productCount: 1
            }
                }
        ]);

        const periodTotals = await Order.aggregate([
            { $match: { status: {$in: ['Delivered']},...periodFilter} },
            { $group: { 
                _id: null, 
                totalRevenue: { $sum: '$finalAmount' }, 
                totalOrders: { $sum: 1 } 
            } }
        ]);
        console.log('periodTotals:',periodTotals);
        console.log('revenueLabels:',revenueLabels);
        console.log('ordersLabels:',ordersLabels);
        console.log('revenueData:',revenueData);
        console.log('ordersData:',ordersData);
        console.log('bestSellingProducts:',bestSellingProducts);
        console.log('topCategory:',topCategory);

        return res.json({
            filter,
            revenueLabels,
            revenue: revenueData,
            ordersLabels,
            orders: ordersData,
            bestSellingProducts,
            totalRevenue: periodTotals[0]?.totalRevenue?.toLocaleString() || "0",
            totalOrders: periodTotals[0]?.totalOrders || 0,
            bestCategories: topCategory || null,
            bestCategorySales: topCategory[0]?.sales || 0
        })
    } catch (error) {
        console.log('error in dashboard data', error);
      res.render('admin/pageerror');
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
    loadDashboardData,
    pageError,
    logout
}