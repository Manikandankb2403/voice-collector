require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fetch = require("node-fetch");
const { Dropbox } = require("dropbox");
const ffmpeg = require("fluent-ffmpeg");

const router = express.Router();

// ✅ Get Fresh Dropbox Access Token
const getDropboxAccessToken = async () => {
    try {
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
        if (!data.access_token) throw new Error("Failed to refresh Dropbox access token");
        return data.access_token;
    } catch (error) {
        console.error("❌ Error refreshing Dropbox token:", error);
        throw new Error("Dropbox authorization failed");
    }
};

// ✅ Configure Multer
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Upload & Convert Audio
router.post("/upload", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const dropboxAccessToken = await getDropboxAccessToken();
        const dbx = new Dropbox({ accessToken: dropboxAccessToken, fetch });

        const textId = req.body.id || `audio_${Date.now()}`;
        const tempFilePath = `./temp_${textId}.wav`;

        // ✅ Convert to 16kHz WAV
        await new Promise((resolve, reject) => {
            const inputStream = require("stream").Readable.from(req.file.buffer);
            const outputStream = fs.createWriteStream(tempFilePath);

            ffmpeg(inputStream)
                .audioFrequency(16000)
                .toFormat("wav")
                .on("end", resolve)
                .on("error", reject)
                .pipe(outputStream);
        });

        // ✅ Upload to Dropbox
        const dropboxPath = `/Voice Dataset/${textId}.wav`;
        const fileContent = fs.readFileSync(tempFilePath);

        await dbx.filesUpload({ path: dropboxPath, contents: fileContent, mode: "overwrite" });

        // ✅ Generate Public Link
        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: dropboxPath });

        fs.unlinkSync(tempFilePath); // ✅ Remove temp file
        res.json({ message: "✅ File uploaded!", fileUrl: sharedLink.result.url.replace("?dl=0", "?raw=1") });
    } catch (error) {
        console.error("❌ Upload failed:", error);
        res.status(500).json({ error: "Error uploading file" });
    }
});

// ✅ Fetch Audio Files
router.get("/files", async (req, res) => {
    try {
        const dropboxAccessToken = await getDropboxAccessToken();
        const dbx = new Dropbox({ accessToken: dropboxAccessToken, fetch });

        const response = await dbx.filesListFolder({ path: "/Voice Dataset" });

        const files = await Promise.all(
            response.result.entries.map(async (file) => {
                const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: file.path_lower });
                return { name: file.name, url: sharedLink.result.url.replace("?dl=0", "?raw=1") };
            })
        );

        res.json(files);
    } catch (error) {
        console.error("❌ Error fetching files:", error);
        res.status(500).json({ error: "Error fetching files" });
    }
});

module.exports = router;
