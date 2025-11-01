const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const authController = require('../controllers/authController');
const checkoutController = require('../controllers/checkoutController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Rute Halaman Utama & Domain
router.get('/', mainController.getHomePage);
router.post('/check-domain', mainController.checkDomain);

// Rute Autentikasi
router.get('/register', authController.getRegisterPage);
router.post('/register', authController.handleRegister);
router.get('/login', authController.getLoginPage);
router.post('/login', authController.handleLogin);
router.get('/logout', authController.handleLogout);

// Rute Checkout & Pembayaran
router.get('/checkout', isAuthenticated, checkoutController.getCheckoutPage);
router.post('/apply-voucher', isAuthenticated, checkoutController.applyVoucher);
router.post('/process-payment', isAuthenticated, checkoutController.processPayment);

module.exports = router;