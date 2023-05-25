const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);

const User = require("../models/User");

const isAuthentificated = async (req, res, next) => {
  if (req.headers.authorization) {
    const sentToken = req.headers.authorization.replace("Bearer ", "");
    const findUser = await User.findOne({ token: sentToken });

    if (findUser) {
      req.user = findUser;
      next();
    } else {
      return res.status(401).json("Non autorisé.");
    }
  } else {
    return res.status(401).json("Non autorisé.");
  }
};

module.exports = isAuthentificated;
