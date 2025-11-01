const apiService = require('../services/domainApiService');
const logger = require('../utils/logger');
const Promo = require('../models/promo');
const Voucher = require('../models/voucher');

const tldsToCheckDefault = ['.com', '.id', '.co.id', '.net', '.org', '.xyz'];

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
        return res.status(400).json({ message: 'Kata kunci domain diperlukan.' });
    }

    let domainsToSearch = [];
    const sanitizedKeyword = keyword.trim().toLowerCase();

    if (sanitizedKeyword.includes('.')) {
        domainsToSearch.push(sanitizedKeyword);
    } else {
        domainsToSearch = tldsToCheckDefault.map(tld => sanitizedKeyword + tld);
    }

    try {
        const checkPromises = domainsToSearch.map(domainName => {
            return apiService.checkDomainAvailability(domainName)
                .then(apiResult => ({
                    domain: domainName,
                    isAvailable: apiResult.status === 'available',
                    error: false
                }))
                .catch(error => {
                    logger.error(`Gagal memeriksa TLD: ${domainName}`, { message: error.message });
                    return {
                        domain: domainName,
                        isAvailable: false,
                        error: true,
                        errorMessage: error.message
                    };
                });
        });
        const results = await Promise.all(checkPromises);
        res.status(200).json(results);
    } catch (error) {
        logger.error('Error besar di checkDomain', { message: error.message });
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server.' });
    }
};