var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true }
});

module.exports = UserSchema;