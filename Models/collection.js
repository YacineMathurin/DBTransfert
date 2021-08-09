const mongoose = require("mongoose");

const usersCollection = mongoose.model(
    "fUsers",
    new mongoose.Schema({
        _id: String,
        _data: {},
    })
);
const shopsCollection = mongoose.model(
    "fShops",
    new mongoose.Schema({
        _id: String,
        _data: {},
    })
);
const rolePermissionsCollection = mongoose.model(
    "rolePermissions",
    new mongoose.Schema({
        _id: String,
        _data: {},
    })
);
exports.usersCollection = usersCollection;
exports.shopsCollection = shopsCollection;
exports.rolePermissionsCollection = rolePermissionsCollection;