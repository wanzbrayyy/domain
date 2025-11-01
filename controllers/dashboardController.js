const midtransClient = require('midtrans-client');
const apiService = require('../services/domainApiService');
const User = require('../models/user');
const logger = require('../utils/logger');

const domainPrices = {
    'com': 150000, 'id': 250000, 'co.id': 120000, 'net': 160000,
    'org': 165000, 'xyz': 30000, 'default': 175000
};

const snap = new midtransClient.Snap({
    isProduction: true,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

exports.getDashboard = async (req, res) => {
    try {
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

        res.render('dashboard/settings', {
            user: user,
            title: 'Pengaturan Akun'
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat data pengaturan: ${error.message}`);
        res.redirect('/dashboard');
    }
};

exports.updateUserSettings = async (req, res) => {
    try {
        const { name, email, organization, street_1, city, state, postal_code, voice } = req.body;
        
        const localUpdateData = { name, email };
        if (req.file) {
            localUpdateData.profilePicture = req.file.path;
        }

        await User.findByIdAndUpdate(req.session.user.id, localUpdateData);

        const { data: currentApiCustomer } = await apiService.showCustomer(req.session.user.customerId);

        const apiUpdateData = {
            ...currentApiCustomer,
            name, email, organization, street_1, city, state, postal_code, voice
        };

        await apiService.updateCustomer(req.session.user.customerId, apiUpdateData);
        
        req.session.user.name = name;
        req.session.user.email = email;
        if(req.file) {
            req.session.user.profilePicture = req.file.path;
        }

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
        if (domainDetails.customer_id !== req.session.user.customerId) {
            return res.status(403).send("Akses ditolak.");
        }
        res.render('dashboard/manage-domain', {
            domain: domainDetails, user: req.session.user, title: `Kelola ${domainDetails.name}`
        });
    } catch (error) {
        req.flash('error_msg', `Gagal memuat detail domain: ${error.message}`);
        res.redirect('/dashboard');
    }
};

exports.getConfirmRegistrationPage = (req, res) => {
    const { domain } = req.query;
    if (!domain) {
        req.flash('error_msg', 'Nama domain tidak valid.');
        return res.redirect('/dashboard/buy-domain');
    }
    const tld = domain.split('.').pop();
    const price = domainPrices[tld] || domainPrices['default'];
    req.session.domain_order = { domain, price, period: 1 };
    res.render('dashboard/confirm-registration', {
        title: 'Konfirmasi Pesanan', user: req.session.user,
        order: req.session.domain_order, clientKey: process.env.MIDTRANS_CLIENT_KEY
    });
};

exports.handleTransferDomain = async (req, res) => {
    const { name, auth_code } = req.body;
    logger.info(`TRANSFER: Memulai proses transfer untuk domain: ${name}`);
    try {
        const transferData = { name, auth_code, period: 1, customer_id: req.session.user.customerId };
        await apiService.transferDomain(transferData);
        req.flash('success_msg', `Proses transfer untuk domain ${name} telah berhasil dimulai.`);
        res.redirect('/dashboard');
    } catch (error) {
        logger.error(`TRANSFER: Gagal saat transfer domain: ${name}`, { message: error.message });
        req.flash('error_msg', `Gagal memulai transfer: ${error.message}`);
        res.redirect('/dashboard/transfer-domain');
    }
};

exports.resendVerification = async (req, res) => {
    const { domainId } = req.params;
    try {
        await apiService.resendVerificationEmail(domainId);
        req.flash('success_msg', 'Email verifikasi telah dikirim ulang.');
        res.redirect(`/dashboard/domain/${domainId}/manage`);
    } catch (error) {
        req.flash('error_msg', `Gagal mengirim ulang email: ${error.message}`);
        res.redirect(`/dashboard/domain/${domainId}/manage`);
    }
};

exports.toggleLockStatus = async (req, res) => {
    const { domainId } = req.params;
    try {
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

exports.processDomainPayment = async (req, res) => {
    try {
        const order = req.session.domain_order;
        const user = req.session.user;
        if (!order || !user) throw new Error('Sesi pesanan domain tidak valid. Silakan ulangi.');
        const orderId = `DOM-${user.id.slice(-4)}-${Date.now()}`;
        const parameter = {
            "transaction_details": { "order_id": orderId, "gross_amount": order.price },
            "item_details": [{
                "id": order.domain, "price": order.price, "quantity": 1,
                "name": `Registrasi Domain ${order.domain} (1 Tahun)`
            }],
            "customer_details": { "first_name": user.name, "email": user.email }
        };
        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });
    } catch (error) {
        logger.error('MIDTRANS: Gagal memproses pembayaran domain', { message: error.message });
        res.status(500).json({ error: error.message });
    }
};

exports.handleSuccessfulDomainRegistration = async (req, res) => {
    logger.info('FINALIZE: Memulai finalisasi registrasi domain setelah pembayaran.');
    try {
        const order = req.session.domain_order;
        const user = req.session.user;
        if (!order || !user) throw new Error('Sesi untuk finalisasi tidak ditemukan.');
        const registrationData = {
            name: order.domain, period: order.period, customer_id: user.customerId,
            'nameserver[0]': 'ns1.digitalhostid.co.id', 'nameserver[1]': 'ns2.digitalhostid.co.id',
            'nameserver[2]': 'ns3.digitalhostid.co.id', 'nameserver[3]': 'ns4.digitalhostid.co.id'
        };
        await apiService.registerDomain(registrationData);
        logger.info(`FINALIZE: Domain ${order.domain} berhasil didaftarkan untuk customer ID ${user.customerId}`);
        delete req.session.domain_order;
        req.flash('success_msg', `Selamat! Domain ${order.domain} telah berhasil didaftarkan.`);
        res.status(200).json({ message: 'OK' });
    } catch (error) {
        logger.error('FINALIZE: Gagal mendaftarkan domain setelah pembayaran', { message: error.message });
        req.flash('error_msg', `Pembayaran berhasil, tetapi error saat mendaftarkan domain: ${error.message}. Hubungi support.`);
        res.status(500).json({ error: 'Gagal finalisasi' });
    }
};

exports.getDnsManagerPage = async (req, res) => {
    const { domainId } = req.params;
    try {
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
    const { domainId } = req.params;
    try {
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
    const { domainId } = req.params;
    try {
        const recordData = { type: req.body.type, name: req.body.name, content: req.body.content };
        await apiService.deleteDnsRecord(domainId, recordData);
        req.flash('success_msg', 'DNS record berhasil dihapus.');
    } catch (error) {
        req.flash('error_msg', `Gagal menghapus record: ${error.message}`);
    }
    res.redirect(`/dashboard/domain/${domainId}/dns`);
};