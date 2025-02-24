import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./styles.css";

const Recorder = () => {
  const [texts, setTexts] = useState([]);
  const [currentText, setCurrentText] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordedFiles, setRecordedFiles] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]); // ✅ Stores audio chunks

  // ✅ Load Texts and Audio Files on Page Load
  useEffect(() => {
    fetchTexts();
    fetchAudioFiles();
  }, []);

  // ✅ Fetch texts from JSONBin.io
  const fetchTexts = async () => {
    try {
      const response = await axios.get(
        "https://api.jsonbin.io/v3/b/67b8cbc4ad19ca34f80cff4d/latest",
        {
          headers: {
            "X-Master-Key": "$2a$10$f9dVpIu0fcBuKvpZr9q8fOg0J.d7oYb97jPLmQ0bwejISYXHoKirK",
          },
          params: { timestamp: new Date().getTime() },
        }
      );

      const textsData = response.data.record.texts || response.data.record || [];
      if (Array.isArray(textsData)) {
        setTexts(textsData);
        setCurrentText(textsData.length > 0 ? textsData[0] : null);
      } else {
        console.error("❌ Fetched data is not an array:", textsData);
      }
    } catch (error) {
      console.error("❌ Error fetching texts:", error.response?.data || error.message);
    }
  };

  // ✅ Fetch recorded audio files from Dropbox
  const fetchAudioFiles = async () => {
    try {
      const response = await axios.get("https://voice-collector-backend.onrender.com/audio/files");
      console.log("🎵 Audio files:", response.data);
      setRecordedFiles(response.data);
    } catch (error) {
      console.error("❌ Error loading audio files:", error);
    }
  };

  // ✅ Handle JSON Upload
  const handleJsonUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          await axios.put(
            "https://api.jsonbin.io/v3/b/67b8cbc4ad19ca34f80cff4d",
            jsonData,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Master-Key": "$2a$10$f9dVpIu0fcBuKvpZr9q8fOg0J.d7oYb97jPLmQ0bwejISYXHoKirK",
              },
            }
          );
          console.log("✅ JSON file uploaded successfully!");
          setTimeout(fetchTexts, 2000);
        } catch (error) {
          console.error("❌ Error parsing/uploading JSON file:", error);
        }
      };
      fileReader.readAsText(file);
    } catch (error) {
      console.error("❌ Error uploading JSON file:", error);
    }
  };

  // ✅ Start/Stop Recording
  const toggleRecording = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = []; // ✅ Reset before new recording

        mediaRecorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setRecording(true);
        console.log("🎤 Recording started");
      } catch (err) {
        console.error("❌ Microphone access denied:", err);
      }
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      console.log("⏹ Recording stopped");
    }
  };

  // ✅ Save Recording to Dropbox
  const saveRecording = async () => {
    try {
      if (!audioBlob || !currentText) {
        console.error("❌ No audio or text available.");
        return;
      }

      const formData = new FormData();
      const textId = currentText.id || `text_${Date.now()}`; // ✅ Use JSON text ID as filename
      formData.append("audio", audioBlob, `${textId}.wav`);
      formData.append("id", textId);

      const response = await axios.post(
        "https://voice-collector-backend.onrender.com/audio/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("✅ File uploaded:", response.data.fileUrl);

      // ✅ Remove first text after saving
      await removeFirstText();

      setAudioBlob(null);
      setAudioUrl(null);
      fetchAudioFiles(); // ✅ Refresh recorded files
    } catch (error) {
      console.error("❌ Error saving audio:", error.response?.data || error.message);
    }
  };

  // ✅ Remove first text after saving audio
  const removeFirstText = async () => {
    if (!texts.length) return;
    const newTexts = texts.slice(1);

    try {
      await axios.put(
        "https://api.jsonbin.io/v3/b/67b8cbc4ad19ca34f80cff4d",
        { texts: newTexts },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": "$2a$10$f9dVpIu0fcBuKvpZr9q8fOg0J.d7oYb97jPLmQ0bwejISYXHoKirK",
          },
        }
      );

      setTexts(newTexts);
      setCurrentText(newTexts.length > 0 ? newTexts[0] : null);
    } catch (error) {
      console.error("❌ Error deleting first text:", error);
    }
  };

  return (
    <div className="container">
      <h1>🎤 Voice Recorder</h1>

      <input type="file" accept=".json" onChange={handleJsonUpload} />
      {texts.length === 0 && <p>⚠ No file uploaded</p>}

      {currentText ? (
        <p>📝 {typeof currentText === "string" ? currentText : currentText.text || "No text available"}</p>
      ) : (
        <p>✅ All recordings completed!</p>
      )}

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
          <p key={index}>
            🔊 <a href={file.url} target="_blank" rel="noopener noreferrer">Recording {index + 1}</a> ▶️
          </p>
        ))
      ) : (
        <p>(No recordings yet)</p>
      )}
    </div>
  );
};

export default Recorder;
