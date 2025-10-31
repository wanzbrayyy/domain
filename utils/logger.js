// utils/logger.js
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'app.log');

const log = (level, message, data = '') => {
    const timestamp = new Date().toISOString();
    const formattedData = data ? `\n--- DATA ---\n${JSON.stringify(data, null, 2)}\n------------` : '';
    const logMessage = `${timestamp} [${level.toUpperCase()}] ${message}${formattedData}\n`;

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Gagal menulis ke file log:', err);
        }
    });
};

module.exports = {
    info: (message, data) => log('info', message, data),
    error: (message, data) => log('error', message, data),
};