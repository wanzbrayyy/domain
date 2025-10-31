// controllers/authController.js
const apiService = require('../services/domainApiService');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

exports.getRegisterPage = (req, res) => {
    const { domain, plan } = req.query;
    res.render('register', {
        error: null,
        domain: domain || '',
        plan: plan || '',
        user: null 
    });
};

exports.getLoginPage = (req, res) => {
    res.render('login', { 
        error: null,
        user: null 
    });
};
exports.handleRegister = async (req, res) => {
    logger.info('CONTROLLER: Proses registrasi dimulai.');
    const { name, email, password, password_confirmation, organization, street_1, city, state, country_code, postal_code, voice, plan } = req.body;

    if (password !== password_confirmation) {
        return res.status(400).render('register', { error: 'Konfirmasi password tidak cocok.', domain: '', plan });
    }

    try {
        const customerData = { name, email, password, password_confirmation, organization, street_1, city, state, country_code, postal_code, voice };
        const newApiCustomer = await apiService.createCustomer(customerData);

        if (!newApiCustomer || !newApiCustomer.data || !newApiCustomer.data.id) {
            throw new Error(newApiCustomer.message || 'Gagal membuat akun pelanggan, ID tidak diterima dari API.');
        }
        const customerApiId = newApiCustomer.data.id;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            name, email,
            password: hashedPassword,
            customerId: customerApiId,
            role: 'customer'
        });
        await newUser.save();
        
        req.session.user = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            customerId: newUser.customerId,
            role: newUser.role
        };

        logger.info('CONTROLLER: Registrasi berhasil, mengarahkan ke checkout.');
        res.redirect(`/checkout?plan=${plan}`);

    } catch (error) {
        logger.error('CONTROLLER: Terjadi error fatal dalam proses registrasi.', { errorMessage: error.message });
        res.status(500).render('register', { 
            error: error.message || 'Gagal mendaftar, silakan coba lagi.',
            domain: '',
            plan
        });
    }
};

exports.handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).render('login', { error: 'Email atau password salah.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).render('login', { error: 'Email atau password salah.' });
        }

        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            customerId: user.customerId,
            role: user.role
        };
        res.redirect('/dashboard');

    } catch (error) {
         res.status(500).render('login', { error: 'Terjadi kesalahan pada server.' });
    }
};

exports.handleLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
};