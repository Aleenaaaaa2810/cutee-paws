const Wallet=require('../../models/walletSchema')
const User=require('../../models/userSchema')
const { v4: uuidv4 } = require('uuid'); 
const Order = require('../../models/orderSchema');
const Coupon=require('../../models/couponSchema')



const getWallet = async (req, res) => {
  const user = req.session.user || null;  


  try {
   
    const wallet = await Wallet.findOne({  userId: user.id });
  

    if (!wallet) {
      return res.render('wallet', { balance: 0, transactions: [] });
    }

   
    res.render('wallet', { balance: wallet.balance, transactions: wallet.transactions ,user});
  }
   catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};



const addMoney = async (req, res) => {
  const { amount } = req.body; 
  console.log("Received body:", req.body);
  const userId = req.session.user?.id; 
  console.log("Session user:", req.session.user);
  
  try {
    // Ensure amount is treated as a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).send("Invalid amount");
    }
    
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: parsedAmount,  // set balance to the received amount
        transactions: [{
          transactionId: uuidv4(),
          description: 'Credit',
          amount: parsedAmount,
          date: new Date()
        }]
      });
      await wallet.save();
    } else {
      // Add the parsed amount to the existing wallet balance
      wallet.balance += parsedAmount;

      // Create a new transaction entry
      wallet.transactions.push({
        transactionId: uuidv4(),
        description: 'Credit',
        amount: parsedAmount,
        date: new Date()
      });

      await wallet.save();
    }

    res.redirect('/wallet'); // Redirect to wallet page after adding money
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};



const walletpay = async (req, res) => {
  console.log("Wallet payment initiated"); 
  
  const userId = req.session?.user?.id;
  const coupon= await Coupon.find({})

    
    
   
  const order = await Order.findOne({ user: userId })
    .sort({ createdOn: -1 }) 
    .lean();

  if (!order) {
    return res.status(404).send('Order not found!');
  }
  
  

  try {
      const userId = req.session.user?.id;
      const { totalPrice ,selectedCoupon} = req.body;
      let discount = 0;
      let couponDetails = null; // Renaming to avoid conflict
      if (selectedCoupon) {
        couponDetails = await Coupon.findOne({ name: selectedCoupon });
       
          discount = Number(couponDetails.offerPrice);
          console.log(discount)
  
        
       
      }
     
      // Calculate final amount (including shipping fee)
      let finalAmount = totalPrice - discount + 60; // Assuming 60 is a fixed shipping fee
  
      console.log("finalprice",finalAmount)

      if (!userId) {
          return res.status(400).json({ success: false, message: 'User ID is missing or invalid!' });
      }

      if (!finalAmount || finalAmount <= 0) {
          return res.status(400).json({ success: false, message: 'Invalid amount!' });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found!' });
      }

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
          return res.status(404).json({ success: false, message: 'Wallet not found!' });
      }

      if (wallet.balance >= finalAmount) {
         
          wallet.balance -= finalAmount;

          
          wallet.transactions.push({
              transactionId: uuidv4(),
              description: 'Debit',
              amount: finalAmount,
              date: new Date(),

          });

          await wallet.save(); 

       
          return res.json({ success: true, redirectUrl: '/submitOrder' });
      } else {
          return res.status(400).json({ success: false, message: 'Insufficient wallet balance!' });
      }
  } catch (error) {
      console.error('Error processing wallet payment:', error);
      return res.status(500).json({ success: false, message: 'Something went wrong!' });
  }
};



module.exports={
  getWallet,
  addMoney,
  walletpay


}