const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// Apply middleware to all routes in this file
router.use(isAuthenticated, isAdmin);

// Admin Dashboard
router.get('/', adminController.getAdminDashboard);

// Domain Management
router.get('/domains', adminController.getDomainsPage);
router.post('/domains/:domainId/suspend', adminController.handleSuspendDomain);
router.post('/domains/:domainId/unsuspend', adminController.handleUnsuspendDomain);

// Voucher Management
router.get('/vouchers', adminController.getVouchersPage);
router.post('/vouchers/create', adminController.createVoucher);

// Promo Management
router.get('/promos', adminController.getPromosPage);
router.post('/promos/create', adminController.createPromo);
router.post('/promos/:id/delete', adminController.deletePromo);

// Notification Management
router.get('/notifications', adminController.getNotificationsPage);
router.post('/notifications/send', adminController.sendNotification);

module.exports = router;