const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());


// ✅ Set up Multer storage for audio uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `audio_${Date.now()}.wav`);
    }
});


const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, "uploads");
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const originalName = file.originalname;
            cb(null, originalName); // Use the provided filename
        }
    })
});
// ✅ API to get the list of uploaded audio files
app.get("/audio/files", (req, res) => {
    const uploadPath = path.join(__dirname, "uploads");

    // Check if the upload directory exists
    if (!fs.existsSync(uploadPath)) {
        return res.json({ files: [] }); // Return empty list if no files
    }

    // Read all files in the uploads folder
    fs.readdir(uploadPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: "Failed to read files" });
        }

        // Generate URLs for the files
        const fileUrls = files.map(file => `https://mega.nz/folder/euAz2bQY#lJiU-hPZaIeDgMHSzQSJoQ/${file}`);
        res.json({ files: fileUrls });
    });
});


// ✅ API to handle file uploads
app.post("/audio/upload", upload.single("audio"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ fileUrl: `https://mega.nz/folder/euAz2bQY#lJiU-hPZaIeDgMHSzQSJoQ/${req.file.filename}` });
});

// ✅ Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
