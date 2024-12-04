const User = require("../../models/userSchema");

const customerManagement = async (req, res) => {
    try {
        let search = req.query.search || ""; 
        let page = parseInt(req.query.page) || 1; 
        const limit = 5; 

        
        const customers = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
                { phone: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit);

        const totalCustomers = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
                { phone: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        });

        res.render("customer", {
            customers,
            totalPages: Math.ceil(totalCustomers / limit),
            currentPage: page,
            search,
        });
    } catch (error) {
        console.error("Error fetching customer management data:", error);
        res.status(500).render("500");
    }
};


const blockCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndUpdate(id, { isBlocked: true });
        res.status(200).json({success:true})
    } catch (error) {
        console.error("Error blocking customer:", error);
        res.status(500).render("500");
    }
};

const unblockCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndUpdate(id, { isBlocked: false });
        res.status(200).json({success:true})

    } catch (error) {
        console.error("Error unblocking customer:", error);
        res.status(500).render("500");
    }
};

module.exports = { customerManagement, blockCustomer, unblockCustomer };
