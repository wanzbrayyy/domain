const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.use(isAuthenticated, isAdmin);

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
router.get('/products', adminController.getProductsPage);
router.post('/products/create', adminController.createProduct);
router.post('/products/:id/delete', adminController.deleteProduct);
router.get('/settings-harga', adminController.getPriceSettingsPage);
router.post('/settings-harga/update', adminController.updatePriceSettings);

module.exports = router;