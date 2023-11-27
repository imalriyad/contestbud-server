const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middlle ware
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("ContestBud server is running...");
});

app.listen(port, () => {
  console.log(`ContestBud server is running on port ${port}`);
});
