// middleware/notificationMiddleware.js
const Notification = require('../models/notification');

exports.fetchNotifications = async (req, res, next) => {
    // Selalu inisialisasi sebagai array kosong terlebih dahulu
    res.locals.notifications = [];

    if (req.session.user) {
        try {
            // Jika user login, coba cari notifikasi dan timpa array kosong tadi
            const notifications = await Notification.find({ user: req.session.user.id, isRead: false })
                .sort({ createdAt: -1 })
                .limit(5);
            res.locals.notifications = notifications;
        } catch (error) {
            console.error("Gagal mengambil notifikasi:", error);
            // Jika gagal, biarkan saja sebagai array kosong yang sudah kita set di awal
        }
    }
    // Lanjutkan ke permintaan berikutnya
    next();
};