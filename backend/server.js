const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Dropbox } = require("dropbox");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Configure Dropbox
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN, fetch: require("node-fetch") });

// ✅ Multer Storage (Temporary Storage Before Uploading to Dropbox)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ API to handle file uploads to Dropbox
app.post("/audio/upload", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const fileName = `/voice-recordings/${req.file.originalname || `audio_${Date.now()}.wav`}`;

        // Upload file to Dropbox
        const response = await dbx.filesUpload({ path: fileName, contents: req.file.buffer });

        // Create a sharable link
        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: response.result.path_lower });

        res.json({ message: "✅ File uploaded successfully!", fileUrl: sharedLink.result.url.replace("?dl=0", "?raw=1") });
    } catch (error) {
        console.error("❌ Upload failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ API to get list of uploaded audio files from Dropbox
app.get("/audio/files", async (req, res) => {
    try {
        const response = await dbx.filesListFolder({ path: "/voice-recordings" });

        const fileLinks = await Promise.all(
            response.result.entries.map(async (file) => {
                const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: file.path_lower });
                return { name: file.name, url: sharedLink.result.url.replace("?dl=0", "?raw=1") };
            })
        );

        res.json(fileLinks);
    } catch (error) {
        console.error("❌ Error fetching files:", error);
        res.status(500).json({ error: "Error fetching files" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
