const apiService = require('../services/domainApiService');
const User = require('../models/user');
const Voucher = require('../models/voucher');
const Promo = require('../models/promo');
const Notification = require('../models/notification');
const Product = require('../models/product');
const Setting = require('../models/setting');
const logger = require('../utils/logger');

exports.getAdminDashboard = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const domainsResponse = await apiService.listDomains({ limit: 1 });
        const domainCount = domainsResponse?.meta?.total || 0;
        res.render('admin/index', {
            title: 'Admin Dashboard', user: req.session.user, userCount, domainCount
        });
    } catch (error) {
        res.status(500).render('admin/error', { message: "Gagal memuat dashboard admin." });
    }
};

exports.getProductsPage = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.render('admin/products', {
            title: 'Kelola Produk', user: req.session.user, products
        });
    } catch (error) {
        res.status(500).render('admin/error', { message: "Gagal memuat halaman produk." });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { category, name, description, price, price_unit, icon, isFeatured, features } = req.body;
        const featureList = features ? features.split(',').map(f => f.trim()) : [];
        await Product.create({
            category, name, description, price, price_unit, icon,
            isFeatured: isFeatured === 'on', features: featureList
        });
        req.flash('success_msg', 'Produk berhasil dibuat.');
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat produk. Nama mungkin sudah ada.');
    }
    res.redirect('/admin/products');
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Produk berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus produk.');
    }
    res.redirect('/admin/products');
};

exports.getPriceSettingsPage = async (req, res) => {
    try {
        const tldPrices = await Setting.findOne({ key: 'tld_prices' });
        const sslPrices = await Setting.findOne({ key: 'ssl_prices' });
        const whoisPrice = await Setting.findOne({ key: 'whois_price' });
        const { data: sslApiProducts } = await apiService.listSslProducts();
        
        res.render('admin/settings-harga', {
            title: 'Pengaturan Harga', user: req.session.user,
            tldPrices: tldPrices ? tldPrices.value : {},
            sslPrices: sslPrices ? sslPrices.value : {},
            whoisPrice: whoisPrice ? whoisPrice.value : 50000,
            sslApiProducts: sslApiProducts || []
        });
    } catch (error) {
        res.status(500).render('admin/error', { message: "Gagal memuat pengaturan harga." });
    }
};

exports.updatePriceSettings = async (req, res) => {
    try {
        const { tld, price, ssl_name, ssl_price, whois_price, remove_tld } = req.body;

        if (remove_tld) {
             await Setting.updateOne({ key: 'tld_prices' }, { $unset: { [`value.${remove_tld}`]: "" } });
        } else if (tld && price) {
            await Setting.updateOne({ key: 'tld_prices' }, { $set: { [`value.${tld.replace('.', '')}`]: Number(price) } }, { upsert: true });
        } else if (ssl_name && ssl_price) {
             await Setting.updateOne({ key: 'ssl_prices' }, { $set: { [`value.${ssl_name}`]: Number(ssl_price) } }, { upsert: true });
        } else if (whois_price) {
            await Setting.updateOne({ key: 'whois_price' }, { $set: { value: Number(whois_price) } }, { upsert: true });
        }
        req.flash('success_msg', 'Pengaturan harga berhasil diperbarui.');
    } catch (error) {
        req.flash('error_msg', 'Gagal memperbarui harga.');
    }
    res.redirect('/admin/settings-harga');
};

exports.getDomainsPage = async (req, res) => {
    try {
        const { data: domains } = await apiService.listDomains({ limit: 20, 'f_params[orderBy][field]': 'created_at', 'f_params[orderBy][type]': 'desc' });
        res.render('admin/domains', {
            domains: domains || [], title: 'Manajemen Domain', user: req.session.user
        });
    } catch (error) {
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
    } catch (error) {
        req.flash('error_msg', `Gagal men-suspend domain: ${error.message}`);
    }
    res.redirect('/admin/domains');
};
exports.handleUnsuspendDomain = async (req, res) => {
    const { domainId } = req.params;
    try {
        await apiService.unsuspendDomain(domainId);
        req.flash('success_msg', 'Domain berhasil diaktifkan kembali.');
    } catch (error) {
        req.flash('error_msg', `Gagal meng-unsuspend domain: ${error.message}`);
    }
    res.redirect('/admin/domains');
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
        const { code, discount, expiryDate } = req.body;
        await Voucher.create({ code: code.toUpperCase(), discount, expiryDate });
        req.flash('success_msg', 'Voucher baru berhasil dibuat.');
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat voucher. Kode mungkin sudah ada.');
    }
    res.redirect('/admin/vouchers');
};
exports.getPromosPage = async (req, res) => {
    try {
        const promos = await Promo.find().sort({ createdAt: -1 });
        res.render('admin/promos', { promos: promos || [], title: 'Kelola Promo', user: req.session.user });
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
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat promo.');
    }
    res.redirect('/admin/promos');
};
exports.deletePromo = async (req, res) => {
    try {
        await Promo.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Promo berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus promo.');
    }
    res.redirect('/admin/promos');
};
exports.getNotificationsPage = async (req, res) => {
    try {
        const users = await User.find({}, 'name email');
        res.render('admin/notifications', { users, title: 'Kirim Notifikasi', user: req.session.user });
    } catch (error) {
        res.status(500).render('admin/error', { message: "Gagal memuat halaman notifikasi." });
    }
};
exports.sendNotification = async (req, res) => {
    try {
        const { userId, title, message, link } = req.body;
        await Notification.create({ user: userId, title, message, link });
        req.flash('success_msg', 'Notifikasi berhasil dikirim.');
    } catch (error) {
        req.flash('error_msg', 'Gagal mengirim notifikasi.');
    }
    res.redirect('/admin/notifications');
};