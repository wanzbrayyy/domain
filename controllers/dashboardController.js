const midtransClient = require('midtrans-client');
const apiService = require('../services/domainApiService');
const User = require('../models/user');
const Setting = require('../models/setting');
const logger = require('../utils/logger');

const snap = new midtransClient.Snap({
    isProduction: true,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

exports.getDashboard = async (req, res) => {
    try {
        const localUser = await User.findById(req.session.user.id).lean();
        req.session.user = { ...req.session.user, ...localUser };

        const customerId = req.session.user.customerId;
        const { data: domains } = await apiService.listDomains({ customer_id: customerId });
        
        res.render('dashboard/index', {
            user: req.session.user,
            domains: domains || [],
            title: 'Dashboard'
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat data dashboard.');
        res.redirect('/');
    }
};

exports.handleDomainOrderFlow = (req, res) => {
    const { domain } = req.query;
    if (!domain) {
        req.flash('error_msg', 'Domain tidak valid.');
        return res.redirect('/');
    }

    req.session.cart = {
        type: 'domain',
        item: { domain },
        options: {
            period: 1,
            buy_whois_protection: false
        }
    };

    if (req.session.user) {
        res.redirect('/checkout');
    } else {
        res.redirect('/register?redirect=/checkout');
    }
};

exports.processDomainPayment = async (req, res) => {
    try {
        const cart = req.session.cart;
        const user = req.session.user;
        if (!cart || !user || cart.type !== 'domain') throw new Error('Sesi tidak valid.');

        const orderId = `DOM-${user.id.slice(-4)}-${Date.now()}`;
        
        let itemDetails = [];
        itemDetails.push({ id: cart.item.domain, price: cart.pricing.basePrice * cart.options.period, quantity: 1, name: `Registrasi Domain ${cart.item.domain} (${cart.options.period} Tahun)`});
        if(cart.options.buy_whois_protection) {
            itemDetails.push({ id: 'WHOIS', price: cart.pricing.whoisPrice, quantity: 1, name: 'Proteksi WHOIS'});
        }

        const parameter = {
            "transaction_details": { "order_id": orderId, "gross_amount": cart.pricing.finalPrice },
            "item_details": itemDetails,
            "customer_details": { "first_name": user.name, "email": user.email }
        };

        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token, orderId: orderId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.handleSuccessfulDomainRegistration = async (req, res) => {
    try {
        const cart = req.session.cart;
        const user = req.session.user;
        if (!cart || !user || cart.type !== 'domain') throw new Error('Sesi finalisasi tidak ditemukan.');
        
        const registrationData = {
            name: cart.item.domain,
            period: cart.options.period,
            customer_id: user.customerId,
            buy_whois_protection: cart.options.buy_whois_protection,
            'nameserver[0]': 'ns1.digitalhostid.co.id',
            'nameserver[1]': 'ns2.digitalhostid.co.id'
        };

        await apiService.registerDomain(registrationData);
        
        delete req.session.cart;
        req.flash('success_msg', `Selamat! Domain ${cart.item.domain} telah berhasil didaftarkan.`);
        res.status(200).json({ message: 'OK' });
    } catch (error) {
        logger.error('FINALIZE: Gagal mendaftarkan domain setelah pembayaran', { message: error.message });
        req.flash('error_msg', `Pembayaran berhasil, tetapi error saat mendaftarkan domain: ${error.message}. Hubungi support.`);
        res.status(500).json({ error: 'Gagal finalisasi' });
    }
};

exports.getBuyDomainPage = (req, res) => {
    res.render('dashboard/buy-domain', { user: req.session.user, title: 'Beli Domain Baru' });
};

exports.getTransferDomainPage = (req, res) => {
    res.render('dashboard/transfer-domain', { title: 'Transfer Domain', user: req.session.user });
};

exports.getSettingsPage = async (req, res) => {
    try {
        const localUser = await User.findById(req.session.user.id).lean();
        if (!localUser) {
            req.flash('error_msg', 'Sesi pengguna tidak valid.');
            return res.redirect('/login');
        }
        const { data: apiCustomer } = await apiService.showCustomer(req.session.user.customerId);
        if (!apiCustomer) {
            throw new Error("Data pelanggan tidak ditemukan dari API.");
        }
        const user = { ...apiCustomer, ...localUser };
        res.render('dashboard/settings', { user: user, title: 'Pengaturan Akun' });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat data pengaturan: ${error.message}`);
        res.redirect('/dashboard');
    }
};

exports.updateUserSettings = async (req, res) => {
    try {
        const { name, email, organization, street_1, city, state, postal_code, voice } = req.body;
        const localUpdateData = { name, email };
        if (req.file) { localUpdateData.profilePicture = req.file.path; }
        const updatedUser = await User.findByIdAndUpdate(req.session.user.id, localUpdateData, { new: true });
        const { data: currentApiCustomer } = await apiService.showCustomer(req.session.user.customerId);
        const apiUpdateData = { ...currentApiCustomer, name, email, organization, street_1, city, state, postal_code, voice };
        await apiService.updateCustomer(req.session.user.customerId, apiUpdateData);
        req.session.user = { id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, customerId: updatedUser.customerId, role: updatedUser.role, profilePicture: updatedUser.profilePicture };
        req.flash('success_msg', 'Informasi akun berhasil diperbarui.');
        res.redirect('/dashboard/settings');
    } catch (error) {
        logger.error('Gagal memperbarui pengaturan pengguna', { message: error.message });
        req.flash('error_msg', `Gagal memperbarui akun: ${error.message}`);
        res.redirect('/dashboard/settings');
    }
};

exports.getDomainManagementPage = async (req, res) => {
    try {
        const { domainId } = req.params;
        const domainDetails = await apiService.showDomainById(domainId);
        if (domainDetails.customer_id !== req.session.user.customerId) { return res.status(403).send("Akses ditolak."); }
        res.render('dashboard/manage-domain', { domain: domainDetails, user: req.session.user, title: `Kelola ${domainDetails.name}` });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat detail domain: ${error.message}`);
        res.redirect('/dashboard');
    }
};

exports.handleTransferDomain = async (req, res) => {
    try {
        const { name, auth_code } = req.body;
        const transferData = { name, auth_code, period: 1, customer_id: req.session.user.customerId };
        await apiService.transferDomain(transferData);
        req.flash('success_msg', `Proses transfer untuk domain ${name} telah berhasil dimulai.`);
        res.redirect('/dashboard');
    } catch (error) {
        req.flash('error_msg', `Gagal memulai transfer: ${error.message}`);
        res.redirect('/dashboard/transfer-domain');
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const { domainId } = req.params;
        await apiService.resendVerificationEmail(domainId);
        req.flash('success_msg', 'Email verifikasi telah dikirim ulang.');
        res.redirect(`/dashboard/domain/${domainId}/manage`);
    } catch (error) {
        req.flash('error_msg', `Gagal mengirim ulang email: ${error.message}`);
        res.redirect(`/dashboard/domain/${domainId}/manage`);
    }
};

exports.toggleLockStatus = async (req, res) => {
    try {
        const { domainId } = req.params;
        const domain = await apiService.showDomainById(domainId);
        if (domain.is_locked) {
            await apiService.unlockDomain(domainId);
            req.flash('success_msg', 'Domain berhasil di-unlock.');
        } else {
            await apiService.lockDomain(domainId);
            req.flash('success_msg', 'Domain berhasil di-lock.');
        }
        res.redirect(`/dashboard/domain/${domainId}/manage`);
    } catch (error) {
        req.flash('error_msg', `Gagal mengubah status lock: ${error.message}`);
        res.redirect(`/dashboard/domain/${domainId}/manage`);
    }
};

exports.getDnsManagerPage = async (req, res) => {
    try {
        const { domainId } = req.params;
        const domainDetails = await apiService.showDomainById(domainId);
        if (domainDetails.customer_id !== req.session.user.customerId) return res.status(403).send("Akses ditolak.");
        const dnsData = await apiService.getDnsRecords(domainId);
        res.render('dashboard/manage-dns', {
            title: `DNS Manager - ${domainDetails.name}`, user: req.session.user,
            domainId: domainId, domainName: domainDetails.name, records: dnsData.records || []
        });
    } catch (error) {
        req.flash('error_msg', `Gagal membuka DNS Manager: ${error.message}`);
        res.redirect(`/dashboard/domain/${domainId}/manage`);
    }
};

exports.createDnsRecord = async (req, res) => {
    try {
        const { domainId } = req.params;
        const recordType = req.body.type === 'SPF' ? 'TXT' : req.body.type;
        const recordData = { type: recordType, name: req.body.name, content: req.body.content, ttl: req.body.ttl || 3600 };
        await apiService.createDnsRecord(domainId, recordData);
        req.flash('success_msg', 'DNS record berhasil ditambahkan.');
    } catch (error) {
        req.flash('error_msg', `Gagal menambahkan record: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${domainId}/dns`);
};

exports.deleteDnsRecord = async (req, res) => {
    try {
        const { domainId } = req.params;
        const recordData = { type: req.body.type, name: req.body.name, content: req.body.content };
        await apiService.deleteDnsRecord(domainId, recordData);
        req.flash('success_msg', 'DNS record berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', `Gagal menghapus record: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${domainId}/dns`);
};