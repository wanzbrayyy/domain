// routes/index.js
const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const authController = require('../controllers/authController');
const checkoutController = require('../controllers/checkoutController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', mainController.getHomePage);
router.post('/check-domain', mainController.checkDomain);

router.get('/login', authController.getLoginPage);
router.post('/login', authController.handleLogin);
router.get('/register', authController.getRegisterPage);
router.post('/register', authController.handleRegister);
router.get('/logout', authController.handleLogout);

router.get('/checkout', protect, checkoutController.getCheckoutPage);
router.post('/apply-voucher', protect, checkoutController.applyVoucher);
router.post('/process-payment', protect, checkoutController.processPayment);

module.exports = router;