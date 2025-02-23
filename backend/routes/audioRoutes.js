const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "voice-recordings", // Folder in Cloudinary
        resource_type: "auto",
        allowed_formats: ["wav", "mp3"], // Allowed audio formats
        transformation: [{ quality: "auto" }]
    },
});

const upload = multer({ storage: storage });

// Upload audio file to Cloudinary
router.post("/upload", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Return the Cloudinary URL
        return res.json({
            message: "File uploaded successfully",
            fileUrl: req.file.path, // Cloudinary URL
        });
    } catch (error) {
        console.error("❌ Upload error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

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