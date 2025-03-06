const express = require("express");
const { register, login } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validator");
const { forgotPassSendOtp, passwordRecovery } = require("../controllers/forgotPassController");
const router = express.Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);

router.post("/send-otp-password", forgotPassSendOtp);
router.post("/recovery-password", passwordRecovery);

module.exports = router;
