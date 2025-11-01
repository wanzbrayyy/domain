const apiService = require('../services/domainApiService');
const logger = require('../utils/logger');
const Promo = require('../models/promo');
const Voucher = require('../models/voucher');
const Product = require('../models/product');
const Setting = require('../models/setting');
const axios = require('axios');

exports.getHomePage = async (req, res) => {
    try {
        const activePromo = await Promo.findOne({ isActive: true }).sort({ createdAt: -1 });
        const latestVoucher = await Voucher.findOne({ isActive: true }).sort({ createdAt: -1 });
        const products = await Product.find({ isFeatured: true }).sort({ createdAt: 'asc' }).limit(8);
        
        res.render('index', {
            promo: activePromo,
            voucher: latestVoucher,
            products: products,
            user: req.session.user
        });
    } catch (error) {
        logger.error("Failed to fetch data for homepage", { message: error.message });
        res.render('index', { promo: null, voucher: null, products: [], user: req.session.user });
    }
};

exports.checkDomain = async (req, res) => {
    const { keyword } = req.body;
    if (!keyword || keyword.trim() === '') {
        return res.status(400).json([]);
    }

    const tldPricesSetting = await Setting.findOne({ key: 'tld_prices' });
    const defaultTlds = tldPricesSetting ? Object.keys(tldPricesSetting.value) : ['.com', '.id', '.net', '.org'];
    
    let domainsToSearch = [];
    const sanitizedKeyword = keyword.trim().toLowerCase().replace(/\s/g, '');

    if (sanitizedKeyword.includes('.')) {
        domainsToSearch.push(sanitizedKeyword);
    } else {
        domainsToSearch = defaultTlds.map(tld => sanitizedKeyword + (tld.startsWith('.') ? tld : '.' + tld));
    }

    try {
        const checkPromises = domainsToSearch.map(domainName => {
            return apiService.checkDomainAvailability(domainName)
                .then(apiResult => ({ ...apiResult, error: false }))
                .catch(error => ({ name: domainName, status: 'error', error: true, errorMessage: error.message }));
        });
        const results = await Promise.all(checkPromises);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json([{ name: keyword, status: 'error', error: true, message: 'Server error' }]);
    }
};

exports.getSslPage = async (req, res) => {
    try {
        const { data: sslProducts } = await apiService.listSslProducts();
        const sslPricesSetting = await Setting.findOne({ key: 'ssl_prices' });
        const customPrices = sslPricesSetting ? sslPricesSetting.value : {};

        const productsWithPrices = sslProducts.map(product => {
            return {
                ...product,
                price: customPrices[product.name] || null 
            };
        });

        res.render('ssl', {
            title: 'Beli Sertifikat SSL',
            user: req.session.user,
            sslProducts: productsWithPrices
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar produk SSL.');
        res.redirect('/');
    }
};

exports.checkServerIp = async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        res.status(200).json({
            message: "This is your server's IP Address. Add this IP to your API provider's whitelist.",
            ipAddress: response.data.ip
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to get server IP.", details: error.message });
    }
};