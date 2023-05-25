const mongoose = require("mongoose");

const User = mongoose.model("User", {
  username: { type: String, require: true },
  mail: { type: String, require: true },
  salt: { type: String, require: true },
  hash: { type: String, require: true },
  token: { type: String, require: true },
  newsLetter: { type: Boolean, default: true },
  date: { type: Date, require: true, default: new Date() },
  avatar: Object,
});

module.exports = User;
