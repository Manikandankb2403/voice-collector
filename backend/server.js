const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure required folders exist
const dataFolderPath = path.join(__dirname, "data");
const uploadsFolderPath = path.join(__dirname, "uploads");
const textsFilePath = path.join(dataFolderPath, "texts.json");

fs.ensureDirSync(dataFolderPath);
fs.ensureDirSync(uploadsFolderPath);

// Create texts.json if missing
if (!fs.existsSync(textsFilePath)) {
    fs.writeJsonSync(textsFilePath, []);
}

console.log("📁 Server initialized. Data and uploads folders are set up.");

// Routes
const textRoutes = require("./routes/textRoutes");
const audioRoutes = require("./routes/audioRoutes");

app.use("/texts", textRoutes);
app.use("/audio", audioRoutes);

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
