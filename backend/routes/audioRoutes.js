require("dotenv").config(); // Load environment variables

const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const KRAKENFILES_API_URL = "https://api.krakenfiles.com/v1/upload";
const KRAKENFILES_API_KEY = process.env.KRAKENFILES_API_KEY; // Set this in .env

// ✅ Upload audio to KrakenFiles
router.post("/upload", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        console.log(`📤 Uploading ${req.file.originalname} to KrakenFiles...`);

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
            const fileData = response.data.data;

            // ✅ Extract the **real** download link
            const fileUrl = fileData.url || fileData.download_url || fileData.links.file;

            if (!fileUrl) {
                console.error("❌ No valid download URL returned from KrakenFiles");
                return res.status(500).json({ error: "Invalid KrakenFiles response", details: fileData });
            }

            console.log(`✅ File uploaded successfully: ${fileUrl}`);

            return res.json({
                message: "File uploaded successfully!",
                url: fileUrl // ✅ Correct KrakenFiles link
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