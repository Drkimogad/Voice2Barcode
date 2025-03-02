// tts.js - Text-to-Speech with QR Generation
let synth = window.speechSynthesis;
let voices = [];
let audioContext;
let mediaRecorder;
let audioChunks = [];

// Initialize voice list
function populateVoiceList() {
    voices = synth.getVoices();
    const maleSelect = document.getElementById('maleVoiceSelect');
    const femaleSelect = document.getElementById('femaleVoiceSelect');
    
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        if (voice.gender === 'male') maleSelect.appendChild(option);
        else if (voice.gender === 'female') femaleSelect.appendChild(option);
    });
}

// Initialize audio context
function initAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// Generate speech and capture audio
async function generateSpeech(text, voiceName) {
    return new Promise((resolve, reject) => {
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = voices.find(v => v.name === voiceName);
            
            // Setup audio recording
            const dest = audioContext.createMediaStreamDestination();
            const sourceNode = audioContext.createMediaStreamSource(
                new MediaStream([utterance.audioStream])
            );
            sourceNode.connect(dest);
            
            mediaRecorder = new MediaRecorder(dest.stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                resolve(URL.createObjectURL(audioBlob));
            };
            
            mediaRecorder.start();
            synth.speak(utterance);
            
            utterance.onend = () => {
                mediaRecorder.stop();
            };
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize TTS functionality
export function initializeTTS() {
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }
    
    initAudioContext();
    
    document.getElementById('textConvertBtn').addEventListener('click', async () => {
        const text = document.getElementById('textToConvert').value;
        const voiceName = document.querySelector('.voice-select').value;
        
        if (!text || !voiceName) {
            updateStatus('Please enter text and select a voice', 'error');
            return;
        }
        
        try {
            const audioURL = await generateSpeech(text, voiceName);
            generateQRFromData(JSON.stringify({
                text,
                voice: voiceName,
                audio: audioURL
            }));
            updateStatus('QR generated! Click to download', 'success');
        } catch (error) {
            updateStatus(`Error: ${error.message}`, 'error');
        }
    });
}
