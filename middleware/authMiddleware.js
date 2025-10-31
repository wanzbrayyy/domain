// middleware/authMiddleware.js
exports.protect = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/dashboard');
};