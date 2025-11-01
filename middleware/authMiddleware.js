exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Silakan login untuk mengakses halaman ini.');
    res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Anda tidak memiliki izin untuk mengakses halaman ini.');
    res.redirect('/dashboard');
};