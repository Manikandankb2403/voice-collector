const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Dropbox } = require("dropbox");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(cors({ origin: "https://voice-collector-frontend.onrender.com" })); // Allow frontend access

// ✅ Generate a fresh Dropbox access token using refresh token
const getDropboxAccessToken = async () => {
    const response = await fetch("https://api.dropbox.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
            client_id: process.env.DROPBOX_APP_KEY,
            client_secret: process.env.DROPBOX_APP_SECRET,
        }),
    });

    const data = await response.json();
    return data.access_token;
};

// ✅ Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload and Convert Audio to Dropbox
app.post("/audio/upload", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const textId = req.body.id || `audio_${Date.now()}`; // Use text ID or fallback
        const tempFilePath = `./temp_${textId}.wav`; // Temp file for conversion

        // ✅ Convert to 16kHz using FFmpeg
        await new Promise((resolve, reject) => {
            const inputStream = require("stream").Readable.from(req.file.buffer);
            const outputStream = fs.createWriteStream(tempFilePath);

            ffmpeg(inputStream)
                .audioFrequency(16000) // ✅ Convert to 16kHz
                .toFormat("wav")
                .on("end", resolve)
                .on("error", reject)
                .pipe(outputStream);
        });

        // ✅ Upload to Dropbox in "Voice Dataset" folder
        const dbx = new Dropbox({ accessToken: await getDropboxAccessToken(), fetch });
        const dropboxPath = `/Voice Dataset/${textId}.wav`;

        const fileContent = fs.readFileSync(tempFilePath);
        await dbx.filesUpload({ path: dropboxPath, contents: fileContent });

        // ✅ Get Public URL
        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: dropboxPath });

        fs.unlinkSync(tempFilePath); // ✅ Delete temp file
        res.json({ message: "✅ File uploaded!", fileUrl: sharedLink.result.url.replace("?dl=0", "?raw=1") });
    } catch (error) {
        console.error("❌ Upload failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Fetch Audio Files from Dropbox
app.get("/audio/files", async (req, res) => {
    try {
        const dbx = new Dropbox({ accessToken: await getDropboxAccessToken(), fetch });
        const response = await dbx.filesListFolder({ path: "/Voice Dataset" });

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

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
