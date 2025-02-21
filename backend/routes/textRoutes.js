const express = require("express");
const fs = require("fs-extra");
const path = require("path");

const router = express.Router();
const textsFilePath = path.join(__dirname, "../data/texts.json");

// Get texts from JSON
router.get("/", (req, res) => {
    if (!fs.existsSync(textsFilePath)) {
        fs.writeJsonSync(textsFilePath, []);
    }

    const texts = fs.readJsonSync(textsFilePath);
    console.log("📜 Current texts:", texts);
    res.json(texts);
});

// Upload new texts.json file
router.post("/upload", async (req, res) => {
    try {
        console.log("📤 Uploading new text file...");
        await fs.writeJson(textsFilePath, req.body.texts);
        console.log("✅ Texts updated successfully");
        res.json({ message: "Texts uploaded successfully" });
    } catch (error) {
        console.error("❌ Error saving texts:", error);
        res.status(500).json({ error: "Error saving texts" });
    }
});

// Remove first text after recording
router.delete("/remove-first", async (req, res) => {
    try {
        const texts = fs.readJsonSync(textsFilePath);
        if (texts.length > 0) {
            console.log("🗑 Removing first text:", texts[0]);
            texts.shift();
            await fs.writeJson(textsFilePath, texts);
        }
        res.json({ message: "First text removed" });
    } catch (error) {
        console.error("❌ Error removing text:", error);
        res.status(500).json({ error: "Error removing text" });
    }
});

module.exports = router;
// Compare this snippet from voice_prepare/frontend/src/components/Recorder.jsx: