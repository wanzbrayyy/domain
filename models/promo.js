// models/Promo.js
const mongoose = require('mongoose');

const PromoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '#' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Promo', PromoSchema);