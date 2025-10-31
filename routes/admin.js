// routes/admin.js
const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(protect, isAdmin);

router.get('/', adminController.getAdminDashboard);

router.get('/domains', adminController.getDomainsPage);
router.post('/domains/:domainId/suspend', adminController.handleSuspendDomain);
router.post('/domains/:domainId/unsuspend', adminController.handleUnsuspendDomain);

router.get('/vouchers', adminController.getVouchersPage);
router.post('/vouchers/create', adminController.createVoucher);

router.get('/promos', adminController.getPromosPage);
router.post('/promos/create', adminController.createPromo);
router.post('/promos/:id/delete', adminController.deletePromo);

router.get('/notifications', adminController.getNotificationsPage);
router.post('/notifications/send', adminController.sendNotification);

module.exports = router;