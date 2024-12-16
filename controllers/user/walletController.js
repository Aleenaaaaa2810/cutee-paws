const Wallet=require('../../models/walletSchema')
const User=require('../../models/userSchema')
const { v4: uuidv4 } = require('uuid'); 
const Order = require('../../models/orderSchema');


const getWallet = async (req, res) => {
  const userId = req.session.user?.id; 
  console.log(userId)

  try {
   
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.render('wallet', { balance: 0, transactions: [] });
    }

   
    res.render('wallet', { balance: wallet.balance, transactions: wallet.transactions });
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

  try {
      const userId = req.session.user?.id;
      const { totalPrice } = req.body;

      if (!userId) {
          return res.status(400).json({ success: false, message: 'User ID is missing or invalid!' });
      }

      if (!totalPrice || totalPrice <= 0) {
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

      if (wallet.balance >= totalPrice) {
         
          wallet.balance -= totalPrice;

          
          wallet.transactions.push({
              transactionId: uuidv4(),
              description: 'Debit',
              amount: totalPrice,
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