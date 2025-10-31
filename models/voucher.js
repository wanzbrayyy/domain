// models/Voucher.js
const mongoose = require('mongoose');

const VoucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    discount: { type: Number, required: true }, 
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    applicable_plans: {
        type: [String],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Voucher', VoucherSchema);