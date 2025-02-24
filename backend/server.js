const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Dropbox } = require("dropbox");
require("dotenv").config();
const fetch = require("node-fetch"); // Ensure node-fetch is installed

const app = express();
app.use(express.json());

// ✅ Enable CORS for Frontend & Allow Testing
app.use(
    cors({
        origin: "*", // Change to frontend URL when in production
        methods: "GET,POST,DELETE",
        allowedHeaders: "Content-Type,Authorization",
    })
);

// ✅ Configure Dropbox
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN, fetch });

// ✅ Multer Storage (Temporary Storage Before Uploading to Dropbox)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Function to Get or Create a Shared Link
const getDropboxSharedLink = async (filePath) => {
    try {
        // Check if a shared link already exists
        const existingLinks = await dbx.sharingListSharedLinks({ path: filePath });

        if (existingLinks.result.links.length > 0) {
            return existingLinks.result.links[0].url.replace("?dl=0", "?raw=1");
        }

        // If no link exists, create a new one
        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: filePath });
        return sharedLink.result.url.replace("?dl=0", "?raw=1");
    } catch (error) {
        console.error("❌ Error generating Dropbox link:", error);
        return null;
    }
};

// ✅ API to Handle File Uploads to Dropbox
app.post("/audio/upload", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const fileName = `/voice-recordings/${req.file.originalname || `audio_${Date.now()}.wav`}`;

        // Upload file to Dropbox
        const response = await dbx.filesUpload({
            path: fileName,
            contents: req.file.buffer,
            mode: { ".tag": "add" }, // Prevent overwriting files
        });

        // Get or Create Shareable Link
        const fileUrl = await getDropboxSharedLink(response.result.path_lower);

        if (!fileUrl) {
            return res.status(500).json({ error: "Failed to generate shareable link" });
        }

        res.json({ message: "✅ File uploaded successfully!", fileUrl });
    } catch (error) {
        console.error("❌ Upload failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ API to Get List of Uploaded Audio Files from Dropbox
app.get("/audio/files", async (req, res) => {
    try {
        const response = await dbx.filesListFolder({ path: "/voice-recordings" });

        const fileLinks = await Promise.all(
            response.result.entries.map(async (file) => {
                const fileUrl = await getDropboxSharedLink(file.path_lower);
                return fileUrl ? { name: file.name, url: fileUrl } : null;
            })
        );

        res.json(fileLinks.filter(Boolean)); // Remove null entries
    } catch (error) {
        console.error("❌ Error fetching files:", error);
        res.status(500).json({ error: "Error fetching files" });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
