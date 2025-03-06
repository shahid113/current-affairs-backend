const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: {type: String},
    emailOTP: { type: String, select: false},
    otpExpiry: { type: Date, select: false },
});

module.exports = mongoose.model("User", UserSchema);
