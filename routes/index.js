const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const authController = require('../controllers/authController');
const checkoutController = require('../controllers/checkoutController');
const dashboardController = require('../controllers/dashboardController'); // Needed for the new domain order flow
const { isAuthenticated } = require('../middleware/authMiddleware');

// Main & Informational Pages
router.get('/', mainController.getHomePage);
router.get('/ssl', mainController.getSslPage);
router.post('/check-domain', mainController.checkDomain);
router.get('/check-ip', mainController.checkServerIp);

// Authentication
router.get('/register', authController.getRegisterPage);
router.post('/register', authController.handleRegister);
router.get('/login', authController.getLoginPage);
router.post('/login', authController.handleLogin);
router.get('/logout', authController.handleLogout);

// Unified Cart & Checkout Flow
router.post('/add-to-cart', checkoutController.addToCart);
router.get('/checkout', isAuthenticated, checkoutController.getCheckoutPage);
router.post('/update-cart-options', isAuthenticated, checkoutController.updateCartOptions);

// This route now points to a dedicated function in the dashboard controller
router.get('/order-domain', dashboardController.handleDomainOrderFlow);

// Payment Processing for Unified Checkout
router.post('/process-payment', isAuthenticated, checkoutController.processPayment);

module.exports = router;