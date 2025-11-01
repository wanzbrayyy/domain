const apiService = require('../services/domainApiService');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

exports.getRegisterPage = (req, res) => {
    const { domain, plan } = req.query;
    res.render('register', {
        error: req.flash('error_msg')[0] || null,
        domain: domain || '',
        plan: plan || '',
        user: null 
    });
};

exports.getLoginPage = (req, res) => {
    res.render('login', { 
        error: req.flash('error_msg')[0] || null,
        user: null 
    });
};

exports.handleRegister = async (req, res) => {
    const { name, email, password, password_confirmation, organization, street_1, city, state, country_code, postal_code, voice, plan } = req.body;

    if (password !== password_confirmation) {
        req.flash('error_msg', 'Konfirmasi password tidak cocok.');
        return res.redirect('/register');
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
            role: 'user'
        });
        await newUser.save();
        
        req.session.user = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            customerId: newUser.customerId,
            role: newUser.role,
            profilePicture: newUser.profilePicture
        };

        if (plan) {
            return res.redirect(`/checkout?plan=${plan}`);
        }
        res.redirect('/dashboard');

    } catch (error) {
        req.flash('error_msg', error.message || 'Gagal mendaftar, email mungkin sudah digunakan.');
        res.redirect('/register');
    }
};

exports.handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'Email atau password salah.');
            return res.redirect('/login');
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Email atau password salah.');
            return res.redirect('/login');
        }

        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            customerId: user.customerId,
            role: user.role,
            profilePicture: user.profilePicture
        };
        res.redirect('/dashboard');

    } catch (error) {
         req.flash('error_msg', 'Terjadi kesalahan pada server.');
         res.redirect('/login');
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