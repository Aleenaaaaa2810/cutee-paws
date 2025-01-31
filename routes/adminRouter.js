const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController=require('../controllers/admin/categoryController')
const productController=require("../controllers/admin/productController")
const orderController=require('../controllers/admin/orderController')
const couponCOntroller=require('../controllers/admin/couponController')
const salesController=require('../controllers/admin/salesController')
const { updateProduct } = require('../controllers/admin/adminController');
const { adminAuth } = require("../middelwares/auth");



const multer = require('multer');

// Check if `updateProduct` is undefined in `adminController.js`

const path = require('path'); // Add this line
const fs = require('fs');
// const upload = require('../config/multerConfig'); 
// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads');
      if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Handle cropped image upload
router.post('/upload-cropped-image', upload.single('image'), (req, res) => {
  console.log(req.file); // Debugging
  if (req.file) {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      res.status(200).json({
          message: 'Image uploaded successfully',
          file: req.file,
          url: fileUrl // Return the URL for the uploaded file
      });
  } else {
      res.status(400).json({ message: 'Image upload failed' });
  }
});

router.get("/pageerror", adminController.pageerror);

router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

router.get("/customers", adminAuth, customerController.customerManagement);
router.post("/customers/block/:id", adminAuth, customerController.blockCustomer);
router.post("/customers/unblock/:id", adminAuth, customerController.unblockCustomer);

router.get("/category",adminAuth,categoryController.CategoryInfo);
router.post("/category/add",adminAuth,categoryController.addCategory)
router.get("/category/edit/:id",adminAuth,categoryController.getcategoryedit)
router.post("/category/edit/:id",adminAuth,categoryController.editcategory);
router.put('/category/toggle/:id', adminAuth,categoryController.CategoryListing);
router.post('/addcategoryoffer',adminAuth,categoryController.addcategoryoffer)
router.post('/removecategoryOffer',adminAuth,categoryController.removecategoryoffer)


router.get('/addproducts',adminAuth,productController.getproductAddpage)
router.post('/addproducts',upload.array("image",3),productController.postProductAdd)
router.get('/products',adminAuth,productController.getproduct)
router.post('/addProductOffer',adminAuth,productController.addproductoffer)
router.post('/removeProductOffer',adminAuth,productController.removeproductoffer)



router.get("/editProduct",adminAuth,productController.editProduct)
router.post("/updateProduct/:id", upload.array("images", 3), productController.updateProduct);
router.delete('/delete-image/:productId/:imageId',adminAuth, productController.removeImage);
router.post('/blockProduct/:productId', adminAuth, productController.blockProduct);

router.post('/unblockProduct/:productId', productController.unblockProduct);


router.get('/orders',adminAuth,orderController.getorder)
router.put('/orders/:orderId',adminAuth,orderController.updateStatusorder)
router.post('/approve-return/:orderId',adminAuth,orderController.approvereturn)

router.delete('/orders/:orderId',adminAuth,orderController.deleteOrder);  

router.get('/coupons',adminAuth,couponCOntroller.loadcoupon)
router.post('/createcoupon',adminAuth,couponCOntroller.createcoupon)
router.get("/editcoupon",adminAuth,couponCOntroller.editcoupon)
router.post('/updateCoupon',adminAuth,couponCOntroller.updatecoupon)
router.delete("/deletecoupon",adminAuth,couponCOntroller.deletecoupon)


router.get('/sales-report',adminAuth,salesController. getSalesReport);
router.get('/sales-report/download-pdf',adminAuth,salesController. downloadPDF);
router.get('/sales-report/download-excel',adminAuth,salesController. downloadExcel);














module.exports = router;
