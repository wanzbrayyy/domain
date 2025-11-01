const midtransClient = require('midtrans-client');
const Voucher = require('../models/voucher');
const Setting = require('../models/setting');
const logger = require('../utils/logger');

const snap = new midtransClient.Snap({
    isProduction: true,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Fungsi baru untuk alur checkout terpadu
exports.getCheckoutPage = async (req, res) => {
    try {
        if (!req.session.cart) {
            req.flash('error_msg', 'Keranjang belanja Anda kosong.');
            return res.redirect('/');
        }
        
        const tldPricesSetting = await Setting.findOne({ key: 'tld_prices' });
        const whoisPriceSetting = await Setting.findOne({ key: 'whois_price' });
        
        const tldPrices = tldPricesSetting ? tldPricesSetting.value : {};
        const whoisPrice = whoisPriceSetting ? whoisPriceSetting.value : 50000;

        let cart = req.session.cart;
        let basePrice = 0;

        if (cart.type === 'domain') {
            const tld = cart.item.domain.split('.').pop();
            basePrice = tldPrices[tld] || 175000;
        } else {
            basePrice = cart.item.price;
        }

        const period = cart.options.period || 1;
        const hasWhois = cart.options.buy_whois_protection || false;
        
        let finalPrice = (basePrice * period) + (hasWhois ? whoisPrice : 0);

        // Simpan detail harga ke session untuk digunakan nanti
        cart.pricing = { basePrice, period, hasWhois, whoisPrice, finalPrice };

        res.render('checkout', {
            title: 'Checkout',
            user: req.session.user,
            cart: cart,
            clientKey: process.env.MIDTRANS_CLIENT_KEY
        });

    } catch (error) {
        req.flash('error_msg', 'Terjadi kesalahan saat memuat checkout.');
        res.redirect('/');
    }
};

// Fungsi baru untuk menambahkan item ke keranjang
exports.addToCart = (req, res) => {
    const { type, itemId, domain, plan, period = 1 } = req.body;
    
    // Logika untuk menyimpan item ke session cart
    if (type === 'domain') {
        req.session.cart = {
            type: 'domain',
            item: { domain },
            options: { period, buy_whois_protection: false }
        };
    } else if (type === 'product') {
        // Logika untuk mengambil detail produk dari DB
        // Disini kita asumsikan plan adalah nama produk
        req.session.cart = {
            type: 'product',
            item: { name: plan, price: req.body.price }, // Anda perlu mengambil harga dari DB
            options: { period }
        };
    }

    if (req.session.user) {
        return res.redirect('/checkout');
    } else {
        return res.redirect('/register');
    }
};

exports.updateCartOptions = (req, res) => {
    if (!req.session.cart) {
        return res.status(400).json({ error: 'Keranjang tidak ditemukan.' });
    }
    const { period, buy_whois_protection } = req.body;
    if (period) req.session.cart.options.period = parseInt(period);
    if (buy_whois_protection !== undefined) {
        req.session.cart.options.buy_whois_protection = buy_whois_protection;
    }
    res.redirect('/checkout');
};

exports.processPayment = async (req, res) => {
    try {
        const cart = req.session.cart;
        const user = req.session.user;
        if (!cart || !user) throw new Error('Sesi tidak valid.');

        const orderId = `${cart.type.toUpperCase()}-${user.id.slice(-4)}-${Date.now()}`;
        let itemDetails = [];
        
        if(cart.type === 'domain') {
            itemDetails.push({ id: cart.item.domain, price: cart.pricing.basePrice * cart.options.period, quantity: 1, name: `Registrasi Domain ${cart.item.domain}`});
            if(cart.options.buy_whois_protection) {
                itemDetails.push({ id: 'WHOIS', price: cart.pricing.whoisPrice, quantity: 1, name: 'Proteksi WHOIS'});
            }
        } else {
             itemDetails.push({ id: cart.item.name, price: cart.pricing.finalPrice, quantity: 1, name: `Produk ${cart.item.name}`});
        }

        const parameter = {
            "transaction_details": { "order_id": orderId, "gross_amount": cart.pricing.finalPrice },
            "item_details": itemDetails,
            "customer_details": { "first_name": user.name, "email": user.email }
        };

        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });
    } catch (error) {
        logger.error('MIDTRANS: Gagal memproses pembayaran', { message: error.message });
        res.status(500).json({ error: error.message });
    }
};