const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

const router = express.Router();
const uploadsFolderPath = path.join(__dirname, "../uploads");

// Ensure the uploads folder exists
fs.ensureDirSync(uploadsFolderPath);

// ✅ Custom Multer Storage - Extract ID from `req.body`
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsFolderPath);
    },
    filename: (req, file, cb) => {
        // ✅ Wait for Multer to process text fields
        process.nextTick(() => {
            console.log("📥 Received upload request");
            console.log("🆔 Received ID:", req.body.id);

            if (!req.body.id) {
                console.error("❌ Error: Missing ID in request");
                return cb(new Error("Missing ID in request"), null);
            }

            const filename = `${req.body.id}.wav`;
            console.log("📁 Saving file as:", filename);
            cb(null, filename);
        });
    },
});

const upload = multer({ storage: storage });

// ✅ Handle Audio Upload
router.post("/upload", upload.single("audio"), (req, res) => {
    console.log("✅ File uploaded successfully:", req.file.filename);
    res.json({ message: "File uploaded successfully!", filename: req.file.filename });
});

// ✅ Fetch Recorded Files
router.get("/files", (req, res) => {
    fs.readdir(uploadsFolderPath, (err, files) => {
        if (err) {
            console.error("❌ Error reading uploads folder:", err);
            return res.status(500).json({ error: "Error reading uploads folder" });
        }
        res.json(files);
    });
});

module.exports = router;
