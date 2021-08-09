const mongoose = require("mongoose");

const UsersPacked = mongoose.model(
    "fUsers",
    new mongoose.Schema({
        _data: {},
        _id: {
            type: String,
            minlength: 5,
            maxlength: 1024,
        },
    })
);
const Users = mongoose.model(
    "users",
    new mongoose.Schema({
        email: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 255,
            unique: true,
        },
        firstname: {
            type: String,
            required: true,
        },
        lastname: {
            type: String,
            required: true,
        },
        shopId: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
        },
        id: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            // required: true,
        },
    })
);

exports.UsersPacked = UsersPacked;
exports.Users = Users;