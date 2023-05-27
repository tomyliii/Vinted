const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
app.use(cors());
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI);

app.use(express.json());
const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

const userRoutes = require("./routes/user");
app.use(userRoutes);

app.get("/", (req, res) => {
  try {
    return res.status(200).json("Bienvenue sur le serveur de Vinted.");
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ message: error.message });
    else {
      return res.status(400).json({ message: error.message });
    }
  }
});

app.all("*", (req, res) => {
  try {
    return res.status(404).json("Page introuvable.");
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ message: error.message });
    else {
      return res.status(400).json({ message: error.message });
    }
  }
});
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("Server: On");
});
