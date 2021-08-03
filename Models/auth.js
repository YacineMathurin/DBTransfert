const mongoose = require("mongoose");

/** Account is the raw imported data from Firebase */
const Account = mongoose.model(
    "accounts",
    new mongoose.Schema({
        users: {},
        _id: {
            type: String,
            minlength: 5,
            maxlength: 1024,
        },
    })
);
/** Auth is the firebase's data like formated data */
const Auth = mongoose.model(
    "auth",
    new mongoose.Schema({
        email: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 255,
            unique: true,
        },
        passwordHash: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 1024,
        },
        displayName: {
            type: String,
            required: true,
        },
        localId: {
            type: String,
            required: true,
        },
        emailVerified: {
            type: Boolean,
            required: true,
        },
        salt: {
            type: String,
            required: true,
        },
        createdAt: {
            type: String,
            required: true,
        },
        disabled: {
            type: Boolean,
            required: true,
        },

    })
);
exports.Account = Account;
exports.Auth = Auth;