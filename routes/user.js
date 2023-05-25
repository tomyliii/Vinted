const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const SHA256 = require("crypto-js/sha256");
const uid2 = require("uid2");
const base64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");
const User = require("../models/User");

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body.name || !req.body.mail || !req.body.password) {
      throw { message: "Entrée(s) non valide(s)." };
    }
    if (!(await User.exists({ mail: req.body.mail }))) {
      const psw = req.body.password;
      const salt = uid2(16);
      const hash = SHA256(psw + salt).toString(base64);
      const token = uid2(16);

      const newUser = new User({
        username: req.body.name,
        mail: req.body.mail,
        salt,
        hash,
        token,
      });
      if (req.files.avatar) {
        const avatar = await cloudinary.uploader.upload(
          convertToBase64(req.files.avatar),
          {
            folder: "vinted/customer_avatar/" + newUser.id,
            public_id: "avatar_" + newUser.id,
          }
        );
        newUser.avatar = {
          public_id: "avatar_" + newUser.id,
          secure_url: avatar.secure_url,
        };
      }

      await newUser.save();

      const response = {
        _id: newUser.id,
        token: newUser.token,
        account: {
          username: newUser.username,
          avatar: newUser.avatar,
        },
      };

      return res.status(201).json(response);
    } else {
      throw { message: "Mail déjà utilisé." };
    }
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ message: error.message });
    else {
      return res.status(400).json({ message: error.message });
    }
  }
});

router.post("/user/login", async (req, res) => {
  try {
    if (req.body.mail && req.body.password) {
      if (await User.exists({ mail: req.body.mail })) {
        const user = await User.findOne({ mail: req.body.mail });
        const hashToLog = SHA256(req.body.password + user.salt).toString(
          base64
        );
        if (hashToLog === user.hash && req.body.mail === user.mail) {
          const response = {
            _id: user._id,
            token: user.token,
            account: {
              username: user.username,
            },
          };
          return res.status(200).json(response);
        } else {
          throw { message: "Mot de passe ou email incorrecte." };
        }
      } else {
        throw { message: "Mot de passe ou email incorrecte." };
      }
    } else {
      throw {
        message: "Veuillez saisir une adresse mail et un mot de passe. ",
      };
    }
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ message: error.message });
    else {
      return res.status(400).json({ message: error.message });
    }
  }
});

module.exports = router;
