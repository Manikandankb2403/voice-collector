require("dotenv").config(); // Load environment variables

const express = require("express");
const axios = require("axios");
const multer = require("multer");
const router = express.Router();

const BIN_ID = "67b8cbc4ad19ca34f80cff4d"; // Replace with your JSONBin Bin ID
const API_KEY = process.env.JSONBIN_API_KEY; // Use API key from .env
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/67b8cbc4ad19ca34f80cff4d`;

// Multer setup for file upload
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Get texts from JSONBin.io
router.get("/", async (req, res) => {
    try {
        const response = await axios.get(JSONBIN_URL, {
            headers: { "X-Master-Key": API_KEY }
        });
        res.json(response.data.record);
    } catch (error) {
        res.status(500).json({ error: "Error fetching texts.json" });
    }
});

// ✅ Upload new JSON file to JSONBin.io
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const jsonData = JSON.parse(req.file.buffer.toString()); // Convert buffer to JSON
        await axios.put(JSONBIN_URL, { texts: jsonData.texts }, {
            headers: { "X-Master-Key": API_KEY, "Content-Type": "application/json" }
        });

        res.json({ message: "✅ JSON updated successfully!" });
    } catch (error) {
        console.error("Error uploading JSON:", error);
        res.status(500).json({ error: "Error updating texts.json" });
    }
});

// ✅ Remove first text after saving audio
router.delete("/remove-first", async (req, res) => {
    try {
        const response = await axios.get(JSONBIN_URL, {
            headers: { "X-Master-Key": API_KEY }
        });
        let texts = response.data.record.texts;

        if (texts.length > 0) {
            texts.shift(); // Remove the first element
            await axios.put(JSONBIN_URL, { texts }, {
                headers: { "X-Master-Key": API_KEY, "Content-Type": "application/json" }
            });
        }

        res.json({ message: "✅ First text removed!" });
    } catch (error) {
        res.status(500).json({ error: "Error removing first text" });
    }
});

module.exports = router;
