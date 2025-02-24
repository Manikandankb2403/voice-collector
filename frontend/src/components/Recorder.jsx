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
  const audioChunksRef = useRef([]); // ✅ FIX: Ensure audioChunks exists

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

  // ✅ Fetch recorded audio files
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

  // ✅ Save Recording
  // ✅ Save Recording in "Voice Dataset" folder and ensure 16kHz sample rate
const saveRecording = async () => {
    if (!currentText || audioChunks.length === 0) return;

    try {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

        // 🔥 Convert audio to 16kHz
        const convertedBlob = await convertAudioTo16kHz(audioBlob);

        // 🔥 Ask user to select a folder (only once)
        const baseHandle = await window.showDirectoryPicker();

        // 🔥 Create or access "Voice Dataset" folder inside selected directory
        const datasetHandle = await baseHandle.getDirectoryHandle("Voice Dataset", { create: true });

        // 🔥 Create and write to the file
        const fileHandle = await datasetHandle.getFileHandle(`${currentText.id}.wav`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(convertedBlob);
        await writable.close();

        console.log(`✅ Saved in Voice Dataset/${currentText.id}.wav`);
        alert(`Saved in: ${baseHandle.name}/Voice Dataset/${currentText.id}.wav`);

        // Remove first text from the list
        await axios.delete("http://localhost:3000/texts/remove-first");
        setTexts((prev) => prev.slice(1));
        setCurrentText(texts[1]);

        setAudioUrl(null);
    } catch (error) {
        console.error("❌ Error saving file:", error);
        alert("Error saving file. Please try again.");
    }
};

// ✅ Function to Convert Audio to 16kHz
const convertAudioTo16kHz = async (blob) => {
    return new Promise((resolve, reject) => {
        const audioContext = new AudioContext({ sampleRate: 16000 }); // Force 16kHz
        const reader = new FileReader();

        reader.onload = async (event) => {
            const arrayBuffer = event.target.result;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, 16000);

            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start();

            offlineContext.startRendering().then((renderedBuffer) => {
                audioContext.close();
                offlineContext.close();

                const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
                resolve(wavBlob);
            });
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

// ✅ Convert AudioBuffer to WAV Blob
const bufferToWave = (buffer, length) => {
    const numOfChan = buffer.numberOfChannels,
        lengthInBytes = length * numOfChan * 2 + 44,
        bufferArray = new ArrayBuffer(lengthInBytes),
        view = new DataView(bufferArray);

    let offset = 0;
    const writeString = (str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset++, str.charCodeAt(i));
        }
    };

    writeString("RIFF");
    view.setUint32(offset, 36 + length * numOfChan * 2, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numOfChan, true);
    offset += 2;
    view.setUint32(offset, 16000, true); // 16kHz sample rate
    offset += 4;
    view.setUint32(offset, 16000 * numOfChan * 2, true);
    offset += 4;
    view.setUint16(offset, numOfChan * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, length * numOfChan * 2, true);
    offset += 4;

    const audioData = new Float32Array(buffer.getChannelData(0));
    const pcmData = new Int16Array(audioData.length);

    for (let i = 0; i < audioData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7fff;
    }

    for (let i = 0; i < pcmData.length; i++, offset += 2) {
        view.setInt16(offset, pcmData[i], true);
    }

    return new Blob([bufferArray], { type: "audio/wav" });
};
// ✅ Fetch Audio Files
const fetchAudioFiles = async () => {
    try {
        const response = await axios.get("https://voice-collector-backend.onrender.com/audio/files");
        console.log("🎵 Audio files:", response.data);
        setRecordedFiles(response.data);
    } catch (error) {
        console.error("❌ Error loading audio files:", error);
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
        <p>📝 {typeof currentText === "string" ? currentText : currentText.Text || "No text available"}</p>
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
