require("dotenv").config();
const express = require("express");
const axios = require("axios");
const multer = require("multer"); // ✅ Import Multer for file uploads

const router = express.Router();
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/67b8cbc4ad19ca34f80cff4d`;
const API_KEY = process.env.JSONBIN_API_KEY;

// ✅ Configure Multer (for JSON file uploads)
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Fetch texts from JSONBin.io
router.get("/", async (req, res) => {
    try {
        const response = await axios.get(JSONBIN_URL, {
            headers: { "X-Master-Key": API_KEY }
        });

        res.json(response.data.record);
    } catch (error) {
        console.error("❌ Error fetching texts:", error.response?.data || error.message);
        res.status(500).json({ error: "Error fetching texts" });
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
        console.error("❌ Error uploading JSON:", error.response?.data || error.message);
        res.status(500).json({ error: "Error updating texts.json" });
    }
});

// ✅ Remove the first text from JSONBin.io
router.delete("/remove-first", async (req, res) => {
    try {
        const response = await axios.get(JSONBIN_URL, {
            headers: { "X-Master-Key": API_KEY }
        });

        let texts = response.data.record.texts || [];
        
        if (texts.length > 0) {
            texts.shift(); // Remove first text

            await axios.put(JSONBIN_URL, { texts }, {
                headers: { "X-Master-Key": API_KEY, "Content-Type": "application/json" }
            });

            res.json({ message: "✅ First text removed!" });
        } else {
            res.status(400).json({ error: "No texts available to remove" });
        }
    } catch (error) {
        console.error("❌ Error removing first text:", error.response?.data || error.message);
        res.status(500).json({ error: "Error removing first text" });
    }
});

module.exports = router;
