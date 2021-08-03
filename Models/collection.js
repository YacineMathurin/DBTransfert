const mongoose = require("mongoose");

const Collection = mongoose.model(
    "rolePermissions",
    new mongoose.Schema({
        _id: String,
        _data: {},
    })
);
exports.Collection = Collection;