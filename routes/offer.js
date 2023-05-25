const express = require("express");
const router = express.Router();

const uid2 = require("uid2");

const base64 = require("crypto-js/enc-base64");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_PUBLIC,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isAuthentificated = require("../middelware/isAuthentificated");

const Offer = require("../models/Offer");
const _ = require("lodash");
const { log } = require("console");

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

const checkValues = (name, price, description) => {
  if (price > 10000) {
    throw {
      message:
        "Valeur trop élevée.Veuillez saisir une valeur inferieur a 10000 euros.",
      status: 400,
    };
  }
  if (description.length > 500) {
    throw {
      message: "Déscription trop longue. Vous etes limité à 500 charactères.",
      status: 400,
    };
  }
  if (name.length > 50) {
    throw {
      message: "Titre trop long. Vous etes limité à 50 charactères.",
      status: 400,
    };
  }
};

router.post(
  "/offer/publish",
  isAuthentificated,
  fileUpload(),
  async (req, res) => {
    try {
      console.log(req.files);
      if (!req.files) {
        throw {
          message: "Veuillez ajouter au moin une image de votre article.",
        };
      }
      const { name, brand, color, size, condition, price, descr, place } =
        req.body;

      const user = req.user;

      if (
        name &&
        brand &&
        color &&
        size &&
        condition &&
        price &&
        descr &&
        place
      ) {
        checkValues(name, price, descr);

        const productImg = req.files.productImg;
        const newOffer = new Offer({
          product_name: name,
          product_description: descr,
          product_price: price,
          product_details: { brand, size, condition, color, place },
          owner: user,
          product_image: {},
        });
        if (productImg.length > 1) {
          for (let i = 0; i < productImg.length; i++) {
            const result = await cloudinary.uploader.upload(
              convertToBase64(productImg[i]),
              {
                public_id: `picture${i}`,
                folder: "/vinted/offers/" + newOffer.id,
              }
            );
            const img = "image" + i;

            newOffer.product_image[img] = {
              public_id: result.public_id,
              secure_url: result.secure_url,
            };
          }
        } else {
          const result = await cloudinary.uploader.upload(
            convertToBase64(productImg),
            {
              public_id: "picture0",
              folder: "/vinted/offers/" + newOffer.id,
            }
          );
          console.log(result);
          newOffer.product_image.image1 = {
            public_id: result.public_id,
            secure_url: result.secure_url,
          };
        }
        await newOffer.save();
        return res
          .status(201)
          .json({ message: "Offre créée.", data: newOffer });
      } else {
        throw {
          message:
            "Information(s) manquante(s). Merci de remplir tous les champs.",
          status: 400,
        };
      }
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ message: error.message });
      else {
        return res.status(400).json({ message: error.message });
      }
    }
  }
);

router.put("/offer/edit", isAuthentificated, fileUpload(), async (req, res) => {
  try {
    const user = req.user;
    if (!(await Offer.findById(req.body.idOffer))) {
      throw { message: "Aucune annonce trouvée.", status: 404 };
    }
    const offer = await Offer.findById(req.body.idOffer)
      .populate("owner", " avatar username -_id")
      .select("-__v");
    // crash si mauvais id

    if (user.id === offer.owner.id) {
      if (req.body.publicid) {
        let imgToAdd = 0;
        const offerImg = Object.keys(offer.product_image);
        const offerImgCount = offerImg.length;

        let imgToDelete = 0;

        if (req.files) {
          if (req.files.productImg.length > 1) {
            imgToAdd = req.files.productImg.length;
          } else {
            imgToAdd++;
          }
        }

        if (typeof req.body.publicid === "string") {
          imgToDelete++;
        } else {
          imgToDelete = req.body.publicid.length;
        }

        if (offerImgCount - (imgToAdd - imgToDelete) <= 0) {
          throw {
            message:
              "Impossible d'exécuter votre demande.Vous devez avoir au moin une photo par article",
            status: 400,
          };
        }
        await cloudinary.api.delete_resources(
          req.body.publicid,
          function (err, result) {
            console.log(result);
          }
        );

        if (typeof req.body.publicid === "string") {
          const imageToDelete = _.findKey(offer.product_image, {
            public_id: req.body.publicid,
          });
          delete offer.product_image[imageToDelete];
        } else {
          req.body.publicid.forEach((publicID) => {
            const imageToDelete = _.findKey(offer.product_image, {
              public_id: publicID,
            });
            delete offer.product_image[imageToDelete];
          });
        }
      }
      if (req.files) {
        const productImg = req.files.productImg;
        const refImg = uid2(3);

        if (productImg.length > 1) {
          for (let i = 0; i < productImg.length; i++) {
            const result = await cloudinary.uploader.upload(
              convertToBase64(productImg[i]),
              {
                public_id: `picture${i}Update${refImg}`,
                folder: "/vinted/offers/" + offer.id,
              }
            );

            const img = "image" + i + refImg;
            offer.product_image[img] = {
              public_id: result.public_id,
              secure_url: result.secure_url,
            };
          }
        } else {
          const result = await cloudinary.uploader.upload(
            convertToBase64(productImg),
            {
              public_id: "picture0Update" + refImg,
              folder: "/vinted/offers/" + offer.id,
            }
          );
          const img = "image" + refImg;
          offer.product_image[img] = {
            public_id: result.public_id,
            secure_url: result.secure_url,
          };
        }
      }

      const { name, brand, color, size, condition, price, descr, place } =
        req.body;

      checkValues(name, price, descr);

      if (name) offer.product_name = name;
      if (brand) offer.product_details[0].brand = brand;
      if (color) offer.product_details[0].color = color;
      if (size) offer.product_details[0].size = size;
      if (condition) offer.product_details[0].condition = condition;
      if (price) offer.product_price = price;
      if (descr) offer.product_description = descr;
      if (place) offer.product_details[0].place = place;

      offer.markModified("product_image");
      offer.markModified("product_details");
      await offer.save();
      return res
        .status(200)
        .json({ message: "Offre mise à jour.", data: offer });
    } else {
      throw {
        message:
          "Vous ne pouvez pas modifier cette annonce.Vous n'etes pas l'auteur.",
        status: 401,
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

router.delete("/offer/delete", isAuthentificated, async (req, res) => {
  try {
    const user = req.user;
    const offer = await Offer.findById(req.body.idOffer).populate("owner");

    // En cas de mauvais ID crash
    if (!offer) {
      throw { message: "Aucune annonce trouvée.", status: 404 };
    }
    const productImg = offer.product_image;

    if (user.id === offer.owner.id) {
      for (let image in productImg) {
        await cloudinary.api.delete_resources(
          productImg[image].public_id,
          function (err, result) {
            console.log(result);
          }
        );
      }
      await cloudinary.api.delete_folder(
        `vinted/offers/${req.body.idOffer}`,
        function (err, result) {
          console.log(result);
        }
      );
      await Offer.findByIdAndDelete(req.body.idOffer);
      return res.status(200).json({ message: "Offre éffacée." });
    } else {
      throw {
        message: "Vous n'etes pas autorisé(e) à effacer cette offre",
        status: 401,
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

router.get("/offers", async (req, res) => {
  try {
    const filter = {};

    const {
      title,
      priceMin,
      priceMax,
      sort,
      page,
      color,
      description,
      size,
      place,
      brand,
      condition,
    } = req.query;
    if (title) {
      filter.product_name = new RegExp(title, "i");
    }
    if (description) {
      filter.product_description = new RegExp(description, "i");
    }
    if (color || size || place || brand || condition) {
      const productdetails = {};
      if (color) {
        productdetails.color = new RegExp(color, "i");
      }

      if (size) {
        productdetails.size = new RegExp(size, "i");
      }
      if (place) {
        productdetails.place = new RegExp(place, "i");
      }
      if (brand) {
        productdetails.brand = new RegExp(brand, "i");
      }

      if (condition) {
        productdetails.condition = new RegExp(condition, "i");
      }
      filter.product_details = { $elemMatch: productdetails };
    }

    if (priceMax || priceMin) {
      const productprice = {};
      if (priceMax) {
        productprice.$lte = priceMax;
      }
      if (priceMin) {
        productprice.$gte = priceMin;
      }
      filter.product_price = productprice;
    }

    let fSort = "";
    if (!sort) {
      fSort = 1;
    } else {
      fSort = sort.replace("price-", "");
    }
    let fPage = "";
    if (!page) {
      fPage = 1;
    } else {
      fPage = page;
    }

    const limit = 3;
    const skip = limit * (Number(fPage) - 1);
    const offers = await Offer.find(filter)
      .sort({ product_price: fSort })
      .limit(3)
      .skip(skip)
      .populate("owner", " avatar username -_id")
      .select("-__v");

    const count = await Offer.countDocuments(filter);
    res.status(200).json({ count, offers });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ message: error.message });
    else {
      return res.status(400).json({ message: error.message });
    }
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    if (req.params.id) {
      const offer = await Offer.findById(req.params.id)
        .populate("owner", "username avatar")
        .select("-__v");
      if (offer) {
        return res
          .status(200)
          .json({ message: "Voici l'offre trouvée.", data: offer });
      } else {
        throw { message: "Offre introuvable. Verifier l'ID.", status: 404 };
      }
    } else {
      throw { message: "ID manquante.", status: 400 };
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
