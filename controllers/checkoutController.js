// controllers/checkoutController.js
const midtransClient = require('midtrans-client');
const Voucher = require('../models/voucher');
const logger = require('../utils/logger');

const planPrices = {
    personal: 12000, startup: 25000,
    bisnis: 39000, enterprise: 59000
};

const snap = new midtransClient.Snap({
    isProduction: true, // SET KE TRUE UNTUK LIVE
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

exports.getCheckoutPage = (req, res) => {
    const { plan } = req.query;
    if (plan && planPrices[plan]) {
        req.session.order = {
            plan: plan, base_price: planPrices[plan],
            final_price: planPrices[plan], voucher_code: null
        };
    }

    // Jika setelah semua itu tidak ada session order, redirect ke harga
    if (!req.session.order) {
        req.flash('error_msg', 'Silakan pilih paket terlebih dahulu.');
        return res.redirect('/#pricing');
    }

    res.render('checkout', {
        title: 'Checkout',
        order: req.session.order,
        clientKey: process.env.MIDTRANS_CLIENT_KEY
    });
};

exports.applyVoucher = async (req, res) => {
    const { voucher_code } = req.body;
    const order = req.session.order;

    // Perbaikan: Jika tidak ada session order, jangan proses.
    if (!order) {
        req.flash('error_msg', 'Sesi pesanan Anda telah berakhir. Silakan pilih paket lagi.');
        return res.redirect('/#pricing');
    }
    
    try {
        if (!voucher_code) throw new Error('Kode voucher tidak boleh kosong.');
        const voucher = await Voucher.findOne({ code: voucher_code.toUpperCase(), isActive: true });
        if (!voucher) throw new Error('Kode voucher tidak ditemukan.');
        if (new Date() > new Date(voucher.expiryDate)) throw new Error('Voucher sudah kedaluwarsa.');
        if (voucher.applicable_plans.length > 0 && !voucher.applicable_plans.includes(order.plan)) {
            throw new Error('Voucher tidak berlaku untuk paket ini.');
        }

        const discountAmount = (order.base_price * voucher.discount) / 100;
        order.final_price = order.base_price - discountAmount;
        order.voucher_code = voucher.code;

        req.flash('success_msg', 'Voucher berhasil diterapkan!');
    } catch (error) {
        order.final_price = order.base_price;
        order.voucher_code = null;
        req.flash('error_msg', error.message);
    }
    // Perbaikan: Selalu redirect kembali ke /checkout, bukan ke halaman lain.
    res.redirect('/checkout');
};

exports.processPayment = async (req, res) => {
    try {
        const order = req.session.order;
        const user = req.session.user;
        if (!order || !user) throw new Error('Sesi tidak valid, silakan ulangi proses.');

        const orderId = `DHID-${user.id.slice(-4)}-${Date.now()}`;
        const parameter = {
            "transaction_details": { "order_id": orderId, "gross_amount": order.final_price },
            "item_details": [{
                "id": order.plan, "price": order.final_price, "quantity": 1,
                "name": `Paket Hosting ${order.plan.charAt(0).toUpperCase() + order.plan.slice(1)}`
            }],
            "customer_details": { "first_name": user.name, "email": user.email }
        };

        const transaction = await snap.createTransaction(parameter);
        const transactionToken = transaction.token;

        logger.info('MIDTRANS: Transaksi dibuat, token:', transactionToken);
        res.json({ token: transactionToken });
    } catch (error) {
        logger.error('MIDTRANS: Gagal memproses pembayaran', { message: error.message });
        res.status(500).json({ error: error.message });
    }
};