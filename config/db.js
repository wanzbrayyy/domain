// config/db.js

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Mengambil URI koneksi dari file .env
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Terhubung: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        // Keluar dari proses dengan kegagalan
        process.exit(1);
    }
};

module.exports = connectDB;