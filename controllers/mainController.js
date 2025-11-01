const apiService = require('../services/domainApiService');
const logger = require('../utils/logger');
const Promo = require('../models/promo');
const Voucher = require('../models/voucher');
const axios = require('axios');

const tldsToCheckDefault = ['.com', '.id', '.co.id', '.net', '.org', '.xyz', '.site'];

exports.getHomePage = async (req, res) => {
    try {
        const activePromo = await Promo.findOne({ isActive: true }).sort({ createdAt: -1 });
        const latestVoucher = await Voucher.findOne({ isActive: true }).sort({ createdAt: -1 });
        res.render('index', {
            promo: activePromo,
            voucher: latestVoucher,
            user: req.session.user
        });
    } catch (error) {
        logger.error("Gagal mengambil data untuk homepage", { message: error.message });
        res.render('index', { promo: null, voucher: null, user: req.session.user });
    }
};

exports.checkDomain = async (req, res) => {
    const { keyword } = req.body;
    if (!keyword || keyword.trim() === '') {
        return res.status(400).json([]);
    }

    let domainsToSearch = [];
    const sanitizedKeyword = keyword.trim().toLowerCase().replace(/\s/g, '');

    if (sanitizedKeyword.includes('.')) {
        domainsToSearch.push(sanitizedKeyword);
    } else {
        domainsToSearch = tldsToCheckDefault.map(tld => sanitizedKeyword + tld);
    }

    try {
        const checkPromises = domainsToSearch.map(domainName => {
            return apiService.checkDomainAvailability(domainName)
                .then(apiResult => {
                    // **PERBAIKAN UTAMA ADA DI SINI**
                    // Kita meneruskan objek asli dari service yang sudah memiliki properti 'name' dan 'status'
                    return {
                        ...apiResult,
                        error: false 
                    };
                })
                .catch(error => {
                    logger.error(`Gagal memeriksa TLD: ${domainName}`, { message: error.message });
                    // **PERBAIKAN KONSISTENSI DI SINI**
                    // Kita membuat objek error dengan properti 'name' dan 'status' agar frontend tidak bingung
                    return {
                        name: domainName,
                        status: 'error',
                        error: true,
                        errorMessage: error.message
                    };
                });
        });
        const results = await Promise.all(checkPromises);
        res.status(200).json(results);
    } catch (error) {
        logger.error('Error besar di checkDomain', { message: error.message });
        res.status(500).json([{ name: keyword, status: 'error', error: true, message: 'Server error' }]);
    }
};


exports.checkServerIp = async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        const serverIp = response.data.ip;
        res.status(200).json({
            message: "Ini adalah Alamat IP server Anda. Tambahkan IP ini ke whitelist API domain Anda.",
            ipAddress: serverIp
        });
    } catch (error) {
        res.status(500).json({
            error: "Gagal mendapatkan IP server.",
            details: error.message
        });
    }
};