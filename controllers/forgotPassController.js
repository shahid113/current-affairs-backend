const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Constants
const OTP_EXPIRY_MINUTES = 15;

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Modern HTML email template
const getOTPMessage = (name, otp) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f7fa;
                }
                .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .header {
                    background: #2c3e50;
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                .content {
                    padding: 30px;
                    line-height: 1.6;
                }
                .otp {
                    background: #eef2f7;
                    padding: 15px;
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .footer {
                    background: #f8fafc;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #64748b;
                }
                .btn {
                    display: inline-block;
                    padding: 10px 20px;
                    background: #3498db;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Password Recovery</h2>
                </div>
                <div class="content">
                    <p>Hello ${name},</p>
                    <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                    <div class="otp">${otp}</div>
                    <p>This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes. Please do not share it with anyone.</p>
                    <p>If you didn't request this, please ignore this email or contact our support team.</p>
                </div>
                <div class="footer">
                    <p>Regards,<br>Current Affairs-AI Team</p>
                    <p>&copy; ${new Date().getFullYear()} Current Affairs-AI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

// Send OTP for forgot password
const forgotPassSendOtp = async (req, res) => {
    const { email } = req.body;
    
    try {
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please provide an email address"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Email not registered"
            });
        }

        await setAndSendOTP(user, "Password Recovery - Current Affairs-AI");
        
        res.status(200).json({
            success: true,
            message: `OTP sent successfully to ${email}`
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

const setAndSendOTP = async (user, subject) => {
    const otp = generateOTP();
    const message = getOTPMessage(user.name, otp);
    
    user.emailOTP = otp;
    user.otpExpiry = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
    await user.save();
    await sendEmail(user.email, subject, message);
};

const passwordRecovery = async (req, res) => {
    const { email, password, otp } = req.body;
    
    try {
        if (!email || !password || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email, password, and OTP are required"
            });
        }

        const user = await User.findOne({ email }).select("emailOTP otpExpiry password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (otp !== user.emailOTP || user.otpExpiry < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Hash the new password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.emailOTP = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        console.error('Password Recovery Error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

const sendEmail = async (email, subject, htmlContent) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"Current Affairs-AI" <${process.env.SMTP_MAIL}>`,
        to: email,
        subject: subject,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email Sending Error:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = {
    forgotPassSendOtp,
    setAndSendOTP,
    passwordRecovery
};