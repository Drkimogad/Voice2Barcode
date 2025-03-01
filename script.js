// Updated script.js
const MAX_RECORD_SECONDS = 10;
const SUPPORTED_AUDIO_TYPES = ['audio/ogg', 'audio/mp3', 'audio/wav']; // Add supported audio types
let currentMode = 'voice';

// Mode switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        document.querySelectorAll('#textInput, #uploadSection').forEach(el => {
            el.style.display = 'none';
        });
        
        if(currentMode === 'text') document.getElementById('textInput').style.display = 'block';
        if(currentMode === 'upload') document.getElementById('uploadSection').style.display = 'block';
    });
});

// Auto-stop recording
let recordingTimer;
mediaRecorder.onstart = () => {
    recordingTimer = setTimeout(() => {
        mediaRecorder.stop();
        updateStatus(`Auto-stopped after ${MAX_RECORD_SECONDS} seconds`, 'success');
    }, MAX_RECORD_SECONDS * 1000);
};

mediaRecorder.onstop = () => {
    clearTimeout(recordingTimer);
    // ... existing onstop logic ...
};

// Text to QR
document.getElementById('textConvertBtn').addEventListener('click', () => {
    const text = document.getElementById('textToConvert').value.slice(0, 200);
    if(text.length < 1) return updateStatus('Enter some text first!', 'error');
    
    const qrData = `text:${text}`;
    generateQRFromData(qrData);
    updateStatus('Text QR generated!', 'success');
});

// Audio upload handling
document.getElementById('audioUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return updateStatus('No file selected!', 'error');
    if(!SUPPORTED_AUDIO_TYPES.includes(file.type)) return updateStatus('Unsupported audio type!', 'error');
    if(file.size > 10 * 1024 * 1024) return updateStatus('File too large! Max 10MB', 'error'); // Example size limit

    try {
        const audioBuffer = await validateAndProcessAudio(file);
        const qrData = await compressAudio(audioBuffer);
        generateQRFromData(qrData);
        updateStatus('Audio processed and QR generated!', 'success');
    } catch (err) {
        updateStatus(err.message, 'error');
    }
});

async function validateAndProcessAudio(file) {
    // Check duration
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    if(audioBuffer.duration > MAX_RECORD_SECONDS) {
        throw new Error(`Audio too long! Max ${MAX_RECORD_SECONDS} seconds`);
    }
    
    return audioBuffer;
}

async function compressAudio(audioBuffer) {
    // Convert to compressed format (simplified example)
    const audioBlob = new Blob([audioBuffer], {type: 'audio/ogg; codecs=opus'});
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(audioBlob);
    });
}

function generateQRFromData(data) {
    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: data,
        width: 200,
        height: 200
    });
    downloadBtn.disabled = false;
}

// Updated QR scanning
scanner.addListener('scan', (content) => {
    try {
        if(content.startsWith('text:')) {
            const text = content.slice(5);
            synthesizeSpeech(text);
        } else if(content.startsWith('audio:')) {
            const audio = new Audio(`data:audio/ogg;base64,${content}`);
            audio.controls = true;
            document.getElementById('scannedAudio').innerHTML = '';
            document.getElementById('scannedAudio').appendChild(audio);
        } else {
            throw new Error('Unsupported QR data format');
        }
        updateStatus('Content decoded successfully!', 'success');
    } catch (err) {
        updateStatus(err.message, 'error');
    }
});

function synthesizeSpeech(text) {
    if('speechSynthesis' in window) {
        const maleVoiceSelect = document.getElementById('maleVoiceSelect');
        const femaleVoiceSelect = document.getElementById('femaleVoiceSelect');

        const selectedVoiceName = maleVoiceSelect.value || femaleVoiceSelect.value;
        const utterance = new SpeechSynthesisUtterance(text);

        const voices = speechSynthesis.getVoices();
        utterance.voice = voices.find((voice) => voice.name === selectedVoiceName);

        speechSynthesis.speak(utterance);
    } else {
        updateStatus('Text-to-speech not supported in this browser', 'error');
    }
}

// Populate voice list on page load
window.onload = populateVoiceList;

function populateVoiceList() {
    if (typeof speechSynthesis === 'undefined') {
        return;
    }

    const voices = speechSynthesis.getVoices();
    const maleVoiceSelect = document.getElementById('maleVoiceSelect');
    const femaleVoiceSelect = document.getElementById('femaleVoiceSelect');

    voices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-name', voice.name);

        if (voice.name.includes('Male')) {
            maleVoiceSelect.appendChild(option);
        } else if (voice.name.includes('Female')) {
            femaleVoiceSelect.appendChild(option);
        }
    });
}
