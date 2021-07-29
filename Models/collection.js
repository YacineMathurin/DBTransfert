const mongoose = require("mongoose");

const Collection = mongoose.model(
    "FWebhooks",
    new mongoose.Schema({
        _id: String,
        _data: {},
    })
);
exports.Collection = Collection;