require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const { Dropbox } = require("dropbox");

const router = express.Router();

// ✅ Initialize Dropbox SDK
const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    fetch: fetch
});

// ✅ Configure Multer (Memory Storage for Direct Upload)
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Upload Audio to Dropbox
router.post("/upload", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const filePath = `${process.env.DROPBOX_FOLDER_PATH}/${req.file.originalname}`;

        // Upload to Dropbox
        const response = await dbx.filesUpload({
            path: filePath,
            contents: req.file.buffer,
            mode: "add"
        });

        // Create a sharable link
        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({
            path: response.result.path_lower,
            settings: { requested_visibility: { ".tag": "public" } }
        });

        res.json({ message: "✅ File uploaded!", fileUrl: sharedLink.result.url.replace("?dl=0", "?raw=1") });
    } catch (error) {
        console.error("❌ Upload failed:", error);
        res.status(500).json({ error: "Error uploading file" });
    }
});

// ✅ Fetch Stored Audio Files
router.get("/files", async (req, res) => {
    try {
        const response = await dbx.filesListFolder({ path: process.env.DROPBOX_FOLDER_PATH });

        const files = response.result.entries.map(file => ({
            name: file.name,
            url: `https://www.dropbox.com/home${file.path_lower}?raw=1`
        }));

        res.json(files);
    } catch (error) {
        console.error("❌ Error fetching files:", error);
        res.status(500).json({ error: "Error fetching files" });
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