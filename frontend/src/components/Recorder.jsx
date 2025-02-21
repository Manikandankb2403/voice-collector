import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./styles.css";

const Recorder = () => {
    const [texts, setTexts] = useState([]);
    const [currentText, setCurrentText] = useState(null);
    const [recording, setRecording] = useState(false);
    const [audioChunks, setAudioChunks] = useState([]);
    const [audioUrl, setAudioUrl] = useState(null);
    const [recordedFiles, setRecordedFiles] = useState([]);
    const mediaRecorderRef = useRef(null);

    // ✅ Load Texts and Recorded Files on Page Load
    useEffect(() => {
        axios.get("http://localhost:3000/texts").then((res) => {
            setTexts(res.data);
            setCurrentText(res.data.length > 0 ? res.data[0] : null);
        });

        axios.get("http://localhost:3000/audio/files").then((res) => {
            setRecordedFiles(res.data);
        });
    }, []);

    // ✅ Upload JSON File
    const handleJsonUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                await axios.post("http://localhost:3000/texts/upload", { texts: data });
                setTexts(data);
                setCurrentText(data.length > 0 ? data[0] : null);
            } catch (error) {
                console.error("Invalid JSON file:", error);
            }
        };
        reader.readAsText(file);
    };

    // ✅ Start/Stop Recording
    const toggleRecording = async () => {
        if (!recording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                let chunks = [];

                mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(chunks, { type: "audio/wav" });
                    setAudioChunks(chunks);
                    setAudioUrl(URL.createObjectURL(audioBlob));
                };

                mediaRecorder.start();
                mediaRecorderRef.current = mediaRecorder;
                setRecording(true);
            } catch (err) {
                console.error("Microphone access denied:", err);
            }
        } else {
            mediaRecorderRef.current?.stop();
            setRecording(false);
        }
    };

    // ✅ Save Recording (Manually triggered)
    const saveRecording = async () => {
        if (!currentText || audioChunks.length === 0) {
            console.error("❌ No text or audio to save.");
            return;
        }
    
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", audioBlob, `${currentText.id}.wav`); // ✅ Ensure correct filename
        formData.append("id", currentText.id); // ✅ Send ID properly
    
        console.log("📢 Sending to backend -> ID:", currentText.id, "| Text:", currentText.text);
    
        try {
            const response = await axios.post("http://localhost:3000/audio/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
    
            console.log("✅ Upload success:", response.data);
    
            await axios.delete("http://localhost:3000/texts/remove-first");
    
            setTexts((prev) => prev.slice(1));
            setCurrentText(texts.length > 1 ? texts[1] : null);
    
            const updatedFiles = await axios.get("http://localhost:3000/audio/files");
            setRecordedFiles(updatedFiles.data);
            setAudioUrl(null);
        } catch (error) {
            console.error("❌ Error saving recording:", error);
        }
    };    

    return (
        <div className="container">
            <h1>🎤 Voice Recorder</h1>

            <input type="file" accept=".json" onChange={handleJsonUpload} />
            {texts.length === 0 && <p>⚠ No file uploaded</p>}

            {currentText ? <p>📝 {currentText.text}</p> : <p>✅ All recordings completed!</p>}

            <button onClick={toggleRecording} disabled={!currentText}>
                {recording ? "⏹ Stop Recording" : "🎤 Start Recording"}
            </button>

            {audioUrl && (
                <>
                    <audio controls src={audioUrl}></audio>
                    <button onClick={saveRecording}>💾 Save Recording</button>
                </>
            )}

            <h2>🎵 Recorded Files</h2>
            {recordedFiles.length > 0 ? (
                recordedFiles.map((file, index) => (
                    <p key={index}>🔊 {file} ▶️</p>
                ))
            ) : (
                <p>(No recordings yet)</p>
            )}
        </div>
    );
};

export default Recorder;
