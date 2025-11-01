const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    customerId: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        default: 'user'
    },
    profilePicture: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);