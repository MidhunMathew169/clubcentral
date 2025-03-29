const Order = require("../../models/orderSchema");

const listOrders = async (req,res) => {
    try {
        const currentPage = parseInt(req.query.page) || 1;
        console.log('currentPage:',currentPage);
        const itemsPerPage = 6;

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
        const skip = (currentPage - 1) * itemsPerPage;

        const orders = await Order.find().populate('userId')
        .sort({orderDate:-1})
        .skip(skip)
        .limit(itemsPerPage);

        console.log('orders are:',orders);
        res.render('admin/orderList',{orders,currentPage,totalPages});

    } catch (error) {
        console.log('error in listing orders:',error);
        res.status(500).send('Internal server error');
    }
}

const orderInfo = async (req,res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findOne({_id:orderId}).populate('address').populate('items.product');
        console.log('order is:',order);
        if(!order){
            console.log('order not found');
            return res.redirect('/admin/orders');
        }
        res.render('admin/orderDetails',{order});
    } catch (error) {
        console.log('error in order info',error);
        res.status(500).send('Internal server error');
    }
}

const updateStatus = async (req,res) =>{
    try {
        const {orderId,status} = req.body;
        let updateOrder;
        
        if(status === 'Delivered'){
        updateOrder = await Order.findOneAndUpdate(
            {_id:orderId},
            {$set:{status:status,paymentStatus:'Paid'}},
            {new:true}
        )
    }
    else{
        updateOrder = await Order.findOneAndUpdate(
            {_id:orderId},
            {$set:{status:status}},
            {new:true}
        )
    }

        if(!updateOrder){
            return res.status(400).json({success:false,message:'Order not found'});
        }

        return res.status(200).json({success:true,message:'Order status updated successfully',order:updateOrder});
    } catch (error) {
        console.log('error in updating order status',error);
        return res.status(500).json({success:false,message:'Internal Server Error'});
    }
}

const cancelOrder = async (req,res) => {
    try {
        console.log('cancel order triggered');
        const {orderId} = req.body;
        console.log('orderId is:',orderId);

        const cancelOrder = await Order.findOneAndUpdate(
            {_id:orderId},
            {$set:{status:'Cancelled'}},
            {new:true}
        );

        if(!cancelOrder){
            console.log('Order not found');
            return res.status(400).json({success:false,message:'Order not found'});
        }
        return res.status(200).json({success:true,message:'Order cancelled successfully',order:cancelOrder});
    } catch (error) {
        console.log('error in canceling order',error);
        return res.status(500).json({success:false,message:'Internal Server Error'});
    }
}

module.exports = {
    listOrders,
    orderInfo,
    updateStatus,
    cancelOrder
}