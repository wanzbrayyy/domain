const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: ['Hosting', 'VPS', 'SSL', 'SEO', 'Lainnya']
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    price_unit: {
        type: String,
        default: '/bln'
    },
    features: [{
        type: String
    }],
    icon: {
        type: String,
        default: 'fas fa-server' 
    },
    isFeatured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);