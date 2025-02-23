require("dotenv").config(); // Load environment variables

const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const KRAKENFILES_API_URL = "https://api.krakenfiles.com/v1/upload";
const KRAKENFILES_API_KEY = process.env.KRAKENFILES_API_KEY; // Ensure this is set in .env

// ✅ Upload audio to KrakenFiles
router.post("/upload", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        console.log(`📤 Uploading ${req.file.originalname} to KrakenFiles...`);

        // ✅ Ensure API key is set
        if (!KRAKENFILES_API_KEY) {
            console.error("❌ Missing KrakenFiles API Key in .env");
            return res.status(500).json({ error: "Server misconfiguration: API key missing" });
        }

        const formData = new FormData();
        formData.append("file", req.file.buffer, req.file.originalname);

        const response = await axios.post(KRAKENFILES_API_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                "Authorization": `Bearer ${KRAKENFILES_API_KEY}`
            }
        });

        if (response.data.success) {
            // ✅ Extract correct download URL
            const fileUrl = response.data.data.url;
            console.log(`✅ File uploaded successfully: ${fileUrl}`);

            return res.json({
                message: "File uploaded successfully!",
                url: fileUrl // ✅ Correct URL
            });
        } else {
            console.error("❌ Upload failed:", response.data);
            return res.status(500).json({ error: "KrakenFiles upload failed", details: response.data });
        }
    } catch (error) {
        console.error("❌ Upload error:", error.response?.data || error.message);
        return res.status(500).json({ error: "Internal server error", details: error.response?.data || error.message });
    }
});

// ✅ Serve uploaded files
// Get list of uploaded files from Cloudinary
router.get("/files", async (req, res) => {
    try {
        const result = await cloudinary.search
            .expression('folder:voice-recordings')
            .execute();

        const files = result.resources.map(file => ({
            url: file.secure_url,
            created_at: file.created_at
        }));

        res.json(files);
    } catch (error) {
        console.error("❌ Error fetching files:", error);
        res.status(500).json({ error: "Error fetching files" });
    }
});
module.exports = router;