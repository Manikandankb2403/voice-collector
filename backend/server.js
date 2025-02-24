const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Dropbox } = require("dropbox");
const ffmpeg = require("fluent-ffmpeg"); // ✅ For audio conversion
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ Enable CORS for Frontend URL
app.use(cors({
    origin: "https://voice-collector-frontend.onrender.com", // Your frontend URL
    methods: "GET,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

// ✅ Configure Dropbox
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN, fetch: require("node-fetch") });

// ✅ Multer Storage (Temporary Storage Before Uploading to Dropbox)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ API to handle file uploads to Dropbox
app.post("/audio/upload", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file || !req.body.id) {
            return res.status(400).json({ error: "Missing file or ID" });
        }

        const textId = req.body.id; // ✅ Get ID from frontend
        const tempFilePath = path.join(__dirname, `${textId}_temp.wav`);
        const convertedFilePath = path.join(__dirname, `${textId}_16khz.wav`);

        // ✅ Save file temporarily for conversion
        fs.writeFileSync(tempFilePath, req.file.buffer);

        // ✅ Convert to 16kHz using FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(tempFilePath)
                .audioFrequency(16000) // ✅ Convert audio to 16kHz
                .toFormat("wav")
                .on("end", resolve)
                .on("error", reject)
                .save(convertedFilePath);
        });

        // ✅ Read converted file and upload to Dropbox
        const convertedAudioBuffer = fs.readFileSync(convertedFilePath);
        const dropboxFilePath = `/Voice Dataset/${textId}.wav`;

        // ✅ Upload file to Dropbox
        const response = await dbx.filesUpload({ path: dropboxFilePath, contents: convertedAudioBuffer });

        // ✅ Create a sharable link
        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: response.result.path_lower });

        // ✅ Cleanup temporary files
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(convertedFilePath);

        res.json({ message: "✅ File uploaded successfully!", fileUrl: sharedLink.result.url.replace("?dl=0", "?raw=1") });
    } catch (error) {
        console.error("❌ Upload failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ API to get list of uploaded audio files from Dropbox
app.get("/audio/files", async (req, res) => {
    try {
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
