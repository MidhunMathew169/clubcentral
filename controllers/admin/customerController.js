const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        const currentPage = parseInt(req.query.page) || 1;

        const limit = 5;
        const totalUsers = await User.countDocuments();
        const user = await User.find({isAdmin:false}).sort({ createdAt: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit);
        const totalPages = Math.ceil(totalUsers / limit);
        res.render('admin/customers', { user, currentPage, totalPages,limit });
    } catch (error) {
        console.error("error in customerInfo");
        res.status(500).send("Internal server error");
    }
}

const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await User.findByIdAndUpdate(userId, { isBlocked: true });
        console.log("User blocked successfully:", userId);
        return res.json({ success: true ,message:"User blocked successfully"});

    } catch (error) {
        console.error("error in blockUser");
        res.status(500).send("Internal server error");
    }
}

const UnBlockUser = async (req,res) => {
    try {
        const userId = req.params.id;
        await User.findByIdAndUpdate(userId, { isBlocked: false });
        console.log("User Unblocked successfully:", userId);
        return res.json({ success: true ,message:"User Unblocked successfully"});
    } catch (error) {
        console.error("error in UnBlockUser");
        res.status(500).send("Internal server error");
    }
}
module.exports = {
    customerInfo,
    blockUser,
    UnBlockUser
}