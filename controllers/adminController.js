// controllers/adminController.js
const apiService = require('../services/domainApiService');
const User = require('../models/user');
const Voucher = require('../models/voucher');
const Promo = require('../models/promo');
const Notification = require('../models/notification');
const logger = require('../utils/logger');

exports.getAdminDashboard = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const domainsResponse = await apiService.listDomains({ limit: 1 });
        const domainCount = domainsResponse && domainsResponse.meta ? domainsResponse.meta.total : 0;
        res.render('admin/index', {
            title: 'Admin Dashboard', user: req.session.user,
            userCount: userCount, domainCount: domainCount
        });
    } catch (error) {
        logger.error("FATAL ERROR di getAdminDashboard", { message: error.message });
        res.status(500).render('admin/error', { message: "Gagal memuat dashboard admin." });
    }
};

exports.getDomainsPage = async (req, res) => {
    try {
        const { data: domains } = await apiService.listDomains({ limit: 20, 'f_params[orderBy][field]': 'created_at', 'f_params[orderBy][type]': 'desc' });
        res.render('admin/domains', {
            domains: domains || [], title: 'Manajemen Domain', user: req.session.user
        });
    } catch (error) {
        logger.error("FATAL ERROR di getDomainsPage", { message: error.message });
        res.status(500).render('admin/error', { message: "Gagal memuat daftar domain." });
    }
};

exports.handleSuspendDomain = async (req, res) => {
    const { domainId } = req.params;
    const { reason } = req.body;
    if (!reason) {
        req.flash('error_msg', 'Alasan suspend diperlukan.');
        return res.redirect('/admin/domains');
    }
    try {
        await apiService.suspendDomain(domainId, reason);
        req.flash('success_msg', 'Domain berhasil disuspend.');
        res.redirect('/admin/domains');
    } catch (error) {
        req.flash('error_msg', `Gagal men-suspend domain: ${error.message}`);
        res.redirect('/admin/domains');
    }
};

exports.handleUnsuspendDomain = async (req, res) => {
    const { domainId } = req.params;
    try {
        await apiService.unsuspendDomain(domainId);
        req.flash('success_msg', 'Domain berhasil diaktifkan kembali.');
        res.redirect('/admin/domains');
    } catch (error) {
        req.flash('error_msg', `Gagal meng-unsuspend domain: ${error.message}`);
        res.redirect('/admin/domains');
    }
};

exports.getVouchersPage = async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.render('admin/vouchers', {
            vouchers: vouchers || [], title: 'Kelola Voucher', user: req.session.user
        });
    } catch (error) {
        res.status(500).render('admin/error', { message: "Gagal memuat halaman voucher." });
    }
};

exports.createVoucher = async (req, res) => {
    try {
        const { code, discount, expiryDate, applicable_plans } = req.body;
        await Voucher.create({
            code: code.toUpperCase(),
            discount,
            expiryDate,
            applicable_plans: applicable_plans || []
        });
        req.flash('success_msg', 'Voucher baru berhasil dibuat.');
        res.redirect('/admin/vouchers');
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat voucher. Kode mungkin sudah ada.');
        res.redirect('/admin/vouchers');
    }
};

exports.getPromosPage = async (req, res) => {
    try {
        const promos = await Promo.find().sort({ createdAt: -1 });
        res.render('admin/promos', {
            promos: promos || [], title: 'Kelola Promo', user: req.session.user
        });
    } catch (error) {
        res.status(500).render('admin/error', { message: "Gagal memuat halaman promo." });
    }
};

exports.createPromo = async (req, res) => {
    try {
        const { title, message, link } = req.body;
        await Promo.updateMany({}, { isActive: false });
        await Promo.create({ title, message, link, isActive: true });
        req.flash('success_msg', 'Promo baru berhasil disimpan dan diaktifkan.');
        res.redirect('/admin/promos');
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat promo.');
        res.redirect('/admin/promos');
    }
};

exports.deletePromo = async (req, res) => {
    try {
        await Promo.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Promo berhasil dihapus.');
        res.redirect('/admin/promos');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus promo.');
        res.redirect('/admin/promos');
    }
};

exports.getNotificationsPage = async (req, res) => {
    try {
        const users = await User.find({}, 'name email');
        res.render('admin/notifications', {
            users: users, title: 'Kirim Notifikasi', user: req.session.user
        });
    } catch (error) {
        res.status(500).render('admin/error', { message: "Gagal memuat halaman notifikasi." });
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { userId, title, message, link } = req.body;
        await Notification.create({ user: userId, title, message, link });
        req.flash('success_msg', 'Notifikasi berhasil dikirim.');
        res.redirect('/admin/notifications');
    } catch (error) {
        req.flash('error_msg', 'Gagal mengirim notifikasi.');
        res.redirect('/admin/notifications');
    }
};