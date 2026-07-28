const nodemailer = require('nodemailer')
const { PASSWORD_RESET_REQUEST_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } = require('./mailtamplate.js');

// Shared transporter factory (creates new transporter each call — legacy behaviour)
const _makeTransporter = () => nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendmail = async (email, otp) => {
    try {
        const transporter = _makeTransporter();
        const mailOptions = {
            from:     'ERP Nexisparkx <nexisparkx@gmail.com>',
            to:       email,
            subject:  'Verify your email',
            html:     VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", otp),
            category: "Email verification"
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        // FIX LOW-5: Log errors instead of silently swallowing them
        console.error('[mailtrap] sendmail failed:', error.message);
    }
};

exports.sendwelcomeemail = async (mail, names) => {
    try {
        const transporter = _makeTransporter();
        const mailOptions = {
            from:     'ERP Nexisparkx <nexisparkx@gmail.com>',
            to:       mail,
            subject:  'Welcome to our website!',
            html:     `Hello ${names}, <br> Welcome to our website! Your account has been created successfully.`,
            category: "Welcome email"
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('[mailtrap] sendwelcomeemail failed:', error.message);
    }
};

exports.resetPasswordmail = async (mail, token) => {
    try {
        const transporter = _makeTransporter();
        const mailOptions = {
            from:     'ERP Nexisparkx <nexisparkx@gmail.com>',
            to:       mail,
            subject:  'Reset your password',
            html:     PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", token),
            category: "Password Reset"
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('[mailtrap] resetPasswordmail failed:', error.message);
    }
};
