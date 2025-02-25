const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { Dropbox } = require("dropbox");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "https://voice-collector-frontend.onrender.com" }));

const textRoutes = require("./routes/textRoutes");
const audioRoutes = require("./routes/audioRoutes");

app.use("/texts", textRoutes);
app.use("/audio", audioRoutes);

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
