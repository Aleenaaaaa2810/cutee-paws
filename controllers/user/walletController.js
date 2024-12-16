const Wallet=require('../../models/walletSchema')
const { v4: uuidv4 } = require('uuid'); 


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




module.exports={
  getWallet,
  addMoney

}