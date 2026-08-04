const nodemailer = require('nodemailer')
const { PASSWORD_RESET_REQUEST_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } = require('./mailtamplate.js');

// Sender address comes from env, same as emailService.js — a hardcoded address
// silently breaks whenever the authenticated Gmail account changes.
const _from = () => `ERP Unified Campus <${process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER}>`;

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
            from:     _from(),
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
            from:     _from(),
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
            from:     _from(),
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
