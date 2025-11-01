const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');
const dashboardController = require('../controllers/dashboardController');

router.get('/', isAuthenticated, dashboardController.getDashboard);
router.get('/buy-domain', isAuthenticated, dashboardController.getBuyDomainPage);
router.get('/order-domain', isAuthenticated, dashboardController.handleDomainOrderFlow);
router.get('/transfer-domain', isAuthenticated, dashboardController.getTransferDomainPage);
router.post('/transfer-domain', isAuthenticated, dashboardController.handleTransferDomain);
router.get('/settings', isAuthenticated, dashboardController.getSettingsPage);
router.post('/settings', isAuthenticated, upload.single('profilePicture'), dashboardController.updateUserSettings);
router.post('/process-domain-payment', isAuthenticated, dashboardController.processDomainPayment);
router.post('/finalize-registration', isAuthenticated, dashboardController.handleSuccessfulDomainRegistration);
router.get('/domain/:domainId/manage', isAuthenticated, dashboardController.getDomainManagementPage);
router.post('/domain/:domainId/toggle-lock', isAuthenticated, dashboardController.toggleLockStatus);
router.post('/domain/:domainId/resend-verification', isAuthenticated, dashboardController.resendVerification);
router.get('/domain/:domainId/dns', isAuthenticated, dashboardController.getDnsManagerPage);
router.post('/domain/:domainId/dns/create', isAuthenticated, dashboardController.createDnsRecord);
router.post('/domain/:domainId/dns/delete', isAuthenticated, dashboardController.deleteDnsRecord);

module.exports = router;