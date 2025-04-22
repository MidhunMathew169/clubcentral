const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const crypto = require("crypto");

const loadCheckout = async(req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        if(!userData){
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({userId}).populate('items.productId');
        console.log('cart:',cart);
        const addresses = await Address.find({userId});
        console.log('address',addresses);
        if(!cart || !cart.items ||cart.items.length === 0){
            console.log('there is no item in the cart');
            return res.render('user/checkout',{
                message:'Cart is empty',
                user:userId,
                addresses:addresses,
                cart:cart || { items:[]},
                products:[],
                cartTotals:{total:0,discount:0,grandTotal:0}
            })
        }

        //calculate cart total
        const cartTotal = cart.items.reduce((total,item) => {
            const product = item.productId;
            const productPrice = product.salePrice;
            const quantity = item.quantity;

            item.subtotal = productPrice * quantity;
            total += item.subtotal;

            return total
        },0)
        
        const cartTotalObj = {
            total: cartTotal,
            deliveryCharge: cartTotal < 4000 ? 40 : 0,
            discountAmount: cartTotal.discountAmount  ? parseFloat(cart.discountAmount) : 0
        };

        cartTotalObj.finalTotal = cartTotalObj.total + cartTotalObj.deliveryCharge - cartTotalObj.discountAmount;
        console.log('cartTotal:', cartTotalObj);

        res.render('user/checkout',{
            user:userData,
            addresses:addresses,
            cart:cart,
            products:cart.items,
            cartTotals:cartTotalObj
        });
    } catch (error) {
        console.error('Error loading checkout page:',error);
        res.status(500).send('Error loading checkout page');
    }
}

const generateOrderId = () => {
    const timestamp = Date.now().toString().slice(-5);
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${timestamp}-${randomStr}`;
}

const generateTransactionId = () => {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');
    return `TXN-${timestamp}-${randomStr}`;
}

const placeOrder = async(req,res) => {
    try {
        console.log('place order triggered');
       const userId = req.session.user;
       const {selectedAddress, paymentOption} = req.body;
       const orderId = generateOrderId();

       console.log('req.body:',req.body);
       if(!selectedAddress || !paymentOption){
        return res.status(400).json({success: false, message: 'Address and payment method are required'});
       }
       
       const cart = await Cart.findOne({ userId }).populate('items.productId');
       console.log('cart:',cart);

       if(!cart || !cart.items || cart.items.length === 0){
        console.log('there is no item in the cart');
        return res.status(400).json({success: false, message: 'Cart is empty'});
       }

       let totalAmount = 0;
       const orderItems = await Promise.all(cart.items.map(async (item) => {
        const subtotal = item.productId.salePrice * item.quantity;
        totalAmount += subtotal;

        //
        const product = await Product.findById(item.productId._id);
        const sizeToUpdate = product.sizes.find(s => s.size === item.size);
        
        if (!sizeToUpdate || sizeToUpdate.quantity < item.quantity) {
            throw new Error(`Insufficient stock for size ${item.size} of product ${item.productId.productName}`);
        }

        // Reduce size-specific quantity
        sizeToUpdate.quantity -= item.quantity;

        product.stock = product.sizes.reduce((total, size) => total + size.quantity, 0);

        product.status = product.stock === 0 ? 'out of stock' : 'Available';

        await product.save();

        return {
            product: item.productId,
            quantity: item.quantity,
            size: item.size,
            price: item.productId.salePrice
        };
       }));
       
       const deliveryCharge = totalAmount < 4000 ? 40 : 0;
       
       let discountAmount = 0;
       let couponApplied = null;

       if(cart.couponCode) {
        const coupon = await Coupon.findOne({code: cart.couponCode});
        if(coupon) {
            discountAmount = parseFloat(cart.discountAmount) || 0;
            console.log('discount amount from cart:',discountAmount);
            couponApplied = coupon._id;
            console.log('applied coupon:',coupon._id,coupon)
            console.log('coupon applied:',couponApplied);

            if(isNaN(discountAmount)){
                console.log('discount is not a number');
                discountAmount = 0;
            }
            
            //update coupon usage count for the user
            const userUsageIndex = coupon.userUsed.findIndex(u => u.userId.toString() === userId.toString());
            if(userUsageIndex >= 0) {
                coupon.userUsed[userUsageIndex].usageCount += 1;
            }else {
                coupon.userUsed.push({
                    userId: userId,
                    usageCount: 1
                });
            }

            await coupon.save();
        }
        console.log('discount amount inside if:',discountAmount)
       }
       console.log('discount amount:',discountAmount);

       const finalTotal = totalAmount + deliveryCharge - discountAmount;

       let paymentStatus = 'Pending';

       if(paymentOption === 'Wallet'){
        const wallet = await Wallet.findOne({userId:userId._id});
        if(!wallet){
            console.log('No wallet found');
            return res.status(400).json({success: false, error: 'No wallet found'});
        }
        if(!wallet || wallet.balance < finalTotal){
            console.log('Insufficient wallet balance');
            return res.status(400).json({success: false, error: 'Insufficient wallet balance'});
        }
        const txnId = generateTransactionId();
        wallet.balance -= finalTotal;
        wallet.transaction.push({
            transactionId: txnId,
            type:'debit',
            amount:finalTotal,
            description:`Payment for order ${orderId}`
        })
        await wallet.save();
        paymentStatus = 'Paid';
       }

       const newOrder = new Order({
        userId:userId,
        orderId:orderId,
        items: orderItems,
        totalPrice:totalAmount,
        discountAmount:discountAmount,
        finalAmount: finalTotal,
        deliveryCharges: deliveryCharge,
        address: selectedAddress,
        paymentMethod: paymentOption,
        paymentStatus: paymentStatus,
        status: 'Pending',
        orderDate: new Date(),
        couponApplied: couponApplied
       });

       await newOrder.save();
       
       await Cart.findOneAndDelete({userId});

       res.status(200).json({ success: true, message: 'Order placed successfully',finalTotal,orderId:newOrder._id});
    } catch (error) {
        console.log('error placing order',error);
        res.status(500).json({ success: false, message: 'Error placing order'});
    }
}

const pendingOrder = async(req,res) => {
    try {
        console.log('pending order triggered');
        const userId = req.session.user;
        const {amount,addressId} = req.body;
        console.log('req.body in pending order:',req.body);

        const cart = await Cart.findOne({userId}).populate('items.productId');

        if(!cart || cart.items.length === 0){
            return res.status(400).json({success:false,message:'Cart is empty'});
        }

        const address = await Address.findOne({_id:addressId});
        if(!address){
            return res.status(400).json({success:false,message:'Address not found'});
        }

        const orderItems = cart.items.map(item =>({
            product:item.productId,
            quantity:item.quantity,
            size:item.size,
            price:item.productId.salePrice,
            subtotal:item.productId.salePrice * item.quantity
        }));

        const deliveryCharge = amount < 4000 ? 40 : 0;

        let discountAmount = 0;
        let couponApplied = null;

        if(cart.couponCode){
            const coupon = await Coupon.findOne({code:cart.couponCode});
            if(coupon){
                discountAmount = parseFloat(cart.discountAmount) || 0;
                couponApplied = coupon._id;

                if(isNaN(discountAmount)){
                    discountAmount = 0;
                }
            }
        }

        const generateOid = generateOrderId();

        const order = new Order({
            userId:userId,
            orderId:generateOid,
            items:orderItems,
            totalPrice:amount + discountAmount,
            discountAmount:discountAmount,
            finalAmount:amount,
            deliveryCharges:deliveryCharge,
            address:address,
            paymentMethod:'Razorpay',
            paymentStatus:'Failed',
            status:'Pending',
            orderDate:new Date(),
            couponApplied:couponApplied
        });

        await order.save();

        return res.status(200).json({success:true,message:'pending order created successfully',orderId:order._id});

    } catch (error) {
        console.log('error in creating pending orders',error);
        return res.status(500).json({success:false,message:'Error creating pending order'});
    }
}

const listOrders = async(req,res) => {
    try {
        const userId = req.session.user;

        const userData = await User.findOne({_id:userId})

        const currentPage = parseInt(req.query.page) || 1;

        const itemsPerPage = 5;

        const totalOrders = await Order.countDocuments({ userId});
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
        const skip = (currentPage - 1) * itemsPerPage;

        const orders = await Order.find({ userId}).populate('items.product')
        .sort({orderDate:-1})
        .skip(skip)
        .limit(itemsPerPage);
        console.log('orders are:',orders);
        res.render('user/orders',{user:userData,orders,currentPage,totalPages});
    } catch (error) {
        console.error('Error listing orders:',error);
        res.status(500).send('Error listing orders');
    }
}

const cancelOrder = async(req,res)=>{
    try {
        console.log('cancelling order');
        const user = req.session.user;
        console.log('user is:',user);
        if(!user || !user._id){
            return res.status(400).json({success:false,message:'User not found'});
        }
        const txnId = generateTransactionId();
        const {orderId} = req.body;
        console.log('orderId is:',orderId);
        const order = await Order.findOne({_id:orderId});
        if(!order){
            return res.status(400).json({success:false,message:'Order not found'});
        }

        const wallet = await Wallet.findOne({userId:user._id});

        if(!wallet){
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
                transaction: []
            })
            await wallet.save();
        }

        const refundAmount = order.finalAmount;
        console.log('refundAmount:',refundAmount);

        if(order.paymentMethod !== 'COD' && order.paymentStatus === 'Paid'){
            wallet.balance += refundAmount;
            wallet.transaction.push({
                transactionId: txnId,
                type: 'credit',
                amount: refundAmount,
                description: `Refund for cancelled order ${order.orderId}`
            })
        }
        await Wallet.updateOne({userId:user._id},wallet);

        for(const item of order.items){
            const product = await Product.findById(item.product);
            console.log('cancelled product:',product);

            if(product){
                await Product.updateOne(
                    {_id:item.product,"sizes.size":item.size},
                    {$inc:{"sizes.$.quantity":item.quantity}}
                );
        }
    }
        const updateOrder = await Order.findOneAndUpdate(
            {_id:orderId},
            {$set:{'items.$[].status':'Cancelled',status:'Cancelled',paymentStatus:'Refunded'}},
            {new:true}
        );
        if(!updateOrder){
            return res.status(400).json({success:false,message:'Order not found'});
        }
        res.status(200).json({success:true,message:'Order cancelled successfully',order:updateOrder});
    } catch (error) {
        console.log('error cancelling order',error);
        res.status(500).json({success:false,message:'Error cancelling order'});
    }
}

const returnOrder = async (req,res) => {
    try {
        console.log('returning order');
        const user = req.session.user;
        const {orderId} = req.body;

        const txnId = generateTransactionId();
        const order = await Order.findOne({_id:orderId});
        if(!order){
            return res.status(400).json({success:false,message:'Order not found'});
        }

        const wallet = await Wallet.findOne({userId:user._id});
        if(!wallet){
            return res.status(400).json({success:false,message:'Wallet not found'});
        }

        const refundAmount = order.finalAmount;
        console.log('refundAmount:',refundAmount);

        if(order.status === 'Delivered'){
            wallet.balance += refundAmount;
            wallet.transaction.push({
                transactionId: txnId,
                type: 'credit',
                amount: refundAmount,
                description: `Refund for returned order ${order.orderId}`
            })
        }
        await Wallet.updateOne({userId:user._id},wallet);

        const updateOrder = await Order.findOneAndUpdate(
            {_id:orderId},
            {$set:{'items.$[].status':'Returned',status:'Returned',paymentStatus:'Refunded'}},
            {new:true}
        );
        if(!updateOrder){
            return res.status(400).json({success:false,message:'Order not found'});
        }
        return res.status(200).json({success:true,message:'Order returned successfully',order:updateOrder});
    } catch (error) {
        console.log('error returning order',error);
       return res.status(500).json({success:false,message:'Error returning order'});
    }
}

const cancelSingleItem = async (req,res) => {
    try {
        console.log('cancelling single item');
        const user = req.session.user;
        const { orderId, itemId } = req.body;

        if(!user || !user._id){
            return res.status(400).json({success: false, message: 'User not found'});
        }

        const order = await Order.findById(orderId);
        if(!order) {
            return res.status(400).json({success: false, message: 'Order not found'});
        }

        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
        if(itemIndex === -1) {
            return res.status(400).json({success: false, message: 'Item not found in order'});
        }

        const item = order.items[itemIndex];

        //check if item can be cancelled
        if(item.status === 'Delivered' || item.status === 'Cancelled' || item.status === 'Returned'){
            return res.status(400).json({success: false, message: `Item cannot be cancelled because it is already ${item.status}`});
        }

        //Calculate refund amount for the item
        let itemRefundAmount = item.price * item.quantity;

        //if coupon was applied to the order, distribute the discount proportionally
        if(order.couponApplied && order.discount > 0) {
            //Calculate the proportion of this item's value to the total order value
            const totalItemsValue = order.items.reduce((sum, i) => sum + (i.price * i.quantity),0);
            const itemProportion = (item.price * item.quantity) / totalItemsValue;

            //Calculate the coupon discount amount for this item
            const itemCouponDiscount = order.discount * itemProportion;

            itemRefundAmount -= itemCouponDiscount;

            item.discountPerItem = itemCouponDiscount;
        }

        //set refund amount and update item status
        item.refundAmount = itemRefundAmount;
        item.status = 'Cancelled';
        item.cancelledAt = new Date();

        //update final amount
        order.finalAmount -= itemRefundAmount;

        if(order.paymentMethod !== 'COD'){

            let wallet = await Wallet.findOne({userId:user._id});
            if(!wallet) {
                wallet = new Wallet ({
                    userId: user._id,
                    balance: 0,
                    transaction: []
                });
            }

            //add refund to wallet
            const txnId = generateTransactionId();
            wallet.balance += itemRefundAmount;
            wallet.transaction.push({
                transactionId: txnId,
                type: 'credit',
                amount: itemRefundAmount,
                description: `Refund for cancelled item in order ${order.orderId}`
            });
            await wallet.save();
            item.refundStatus = 'Processed';
        }
        else {
            item.refundStatus = 'Not Applicable';
        }

        //Return the item quantity to inventory
        const product = await Product.findById(item.product);
        if(product){
            await Product.updateOne(
                {_id: item.product, "sizes.size": item.size},
                {$inc: {"sizes.$.quantity": item.quantity}}
            );

            //Update total stock
            const updatedProduct = await Product.findById(item.product);
            updatedProduct.stock = updatedProduct.sizes.reduce((total, size) => total + size.quantity, 0);
            updatedProduct.status = updatedProduct.stock === 0 ? 'Out of Stock' : 'Available';
            await updatedProduct.save();
        }

        const allItemsCancelled = order.items.every(i => 
            i.status === 'Cancelled' || i.status === 'Returned'
        );

        if(allItemsCancelled){
            order.status = 'Cancelled';
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Item cancelled successfully',
            refundAmount: itemRefundAmount,
            order: order
        })
    } catch (error) {
        console.log('error in cancel single item',error);
        return res.status(500).json({
            success: false,
            message: 'error in cancel single item'
        });
    }
}

const returnSingleItem = async (req, res) => {
    try {
        console.log('Return single item');
        const user = req.session.user;
        const {orderId, itemId} = req.body;

        if(!user || !user._id) {
            return res.status(400).json({success: false, message: 'User not found'});
        }

        const order = await Order.findById(orderId).populate('items.product');
        if(!order){
            return res.status(400).json({success: false, message: 'Order not found'});
        }

        //find the specific item in the order
        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
        if(itemIndex === -1){
            return res.status(400).json({ success: false, message: 'Item not found in order'});
        }

        const item = order.items[itemIndex];

        if(item.status !== 'Delivered'){
            return res.status(400).json({success: false, message: 'Item cannot be returned'});
        }

        let itemRefundAmount = item.price * item.quantity;

        //if coupon was applied to the order,distribute the discount proportionally
        if (order.couponApplied && order.discount  > 0){
            const totalItemsValue = order.items.reduce((sum, i) => sum + (i.price * i.quantity),0);
            const itemProportion = (item.price * item.quantity) / totalItemsValue;

            const itemCouponDiscount = order.discount * itemProportion;
            itemRefundAmount -= itemCouponDiscount;

            //save the discount per item
            item.discountPerItem = itemCouponDiscount;
        }

        item.refundAmount = itemRefundAmount;
        item.status = 'Returned';
        item.returnedAt = new Date();

        //update final amount
        order.finalAmount -= itemRefundAmount;

        item.refundStatus = 'Processed';

        let wallet = await Wallet.findOne({userId: user._id});
        if(!wallet) {
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
                transaction: []
            });
        }

        //refund amount to wallet
        const txnId = generateTransactionId();
        wallet.balance += itemRefundAmount;
        wallet.transaction.push({
            transactionId: txnId,
            type: 'credit',
            amount: itemRefundAmount,
            description: `Refund for returned item ${order.orderId}`
        });

        await wallet.save();

        const product = await Product.findById(item.product);
        if(product) {
            await Product.updateOne(
                {_id: item.product, "sizes.size": item.size},
                {$inc: {"sizes.$.quantity": item.quantity}}
            );

            //update total stock
            const updatedProduct = await Product.findById(item.product);
            updatedProduct.stock = updatedProduct.sizes.reduce((total, size) => total += size.quantity, 0);
            updatedProduct.status = updatedProduct.stock === 0 ? 'Out of Stock' : 'Available';
            await updatedProduct.save();
        }

        //Check if all items in the order are now returned or cancelled
        const allItemsReturnedOrCancelled = order.items.every(i =>
            i.status === 'Cancelled' || i.status === 'Returned'
        );

        if(allItemsReturnedOrCancelled){
            order.status = 'Cancelled';
        }

        await order.save();

        return res.status(200).json({
            success : true,
            message : 'Item returned successfully',
            refundAmount : itemRefundAmount,
            order : order
        });
    } catch (error) {
        console.log('Error returning item:',error);
        return res.status(500).json({success: false, message: 'Error returning item'});
    }
};

const orderDetails = async(req,res) => {
    try {
        console.log('order details is loaded');
        const userId = req.session.user;
        console.log('userId is:',userId);
        const orderId = req.params.id;
        console.log('orderId is:',orderId);

        const order = await Order.findOne({_id:orderId}).populate('address').populate('items.product');
        console.log('order is:',order);

        if(!order){
            console.log('order not found');
            return res.redirect('/orders');
        }

        res.render('user/order-details',{order,user:userId});

    } catch (error) {
        console.log('error in order details',error);
        res.status(500).send("server error");
    }
}

module.exports = {
    loadCheckout,
    placeOrder,
    pendingOrder,
    listOrders,
    cancelOrder,
    returnOrder,
    cancelSingleItem,
    returnSingleItem,
    orderDetails
}