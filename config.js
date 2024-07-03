const env = process.env;

const config = {
    db: {
        host: env.DB_HOST || 'localhost',
        user: env.DB_USER || 'niamh',
        password: env.DB_PASSWORD || 'niamhclark',
        database: env.DB_NAME || 'online_payment',
        waitForConnections: true,
        connectionLimit: env.DB_CONN_LIMIT || 2,
        queueLimit: 0,
        debug: env.DB_DEBUG || false
    },
    email: {
        user: process.env.EMAIL_USER || 'Enter your email',
        pass: process.env.EMAIL_PASS || 'Enter your password',
    },
};
module.exports = config;
