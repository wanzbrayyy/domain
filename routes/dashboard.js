// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

router.use(protect);

router.get('/', dashboardController.getDashboard);
router.get('/buy-domain', dashboardController.getBuyDomainPage);
router.get('/transfer-domain', dashboardController.getTransferDomainPage);
router.get('/settings', dashboardController.getSettingsPage);
router.post('/settings', dashboardController.updateUserSettings);
router.get('/confirm-registration', dashboardController.getConfirmRegistrationPage);
router.get('/domain/:domainId/manage', dashboardController.getDomainManagementPage);
router.get('/domain/:domainId/dns', dashboardController.getDnsManagerPage);

router.post('/transfer-domain', dashboardController.handleTransferDomain);
router.post('/domain/:domainId/resend-verification', dashboardController.resendVerification);
router.post('/domain/:domainId/toggle-lock', dashboardController.toggleLockStatus);
router.post('/domain/:domainId/dns/create', dashboardController.createDnsRecord);
router.post('/domain/:domainId/dns/delete', dashboardController.deleteDnsRecord);
router.post('/process-domain-payment', dashboardController.processDomainPayment);
router.post('/finalize-registration', dashboardController.handleSuccessfulDomainRegistration);

module.exports = router;