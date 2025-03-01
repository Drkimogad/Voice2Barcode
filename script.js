// Updated script.js
const MAX_RECORD_SECONDS = 10;
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
    if(!file) return;

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
        } else {
            const audio = new Audio(`data:audio/ogg;base64,${content}`);
            audio.controls = true;
            document.getElementById('scannedAudio').innerHTML = '';
            document.getElementById('scannedAudio').appendChild(audio);
        }
        updateStatus('Content decoded successfully!', 'success');
    } catch (err) {
        updateStatus('Decoding failed', 'error');
    }
});

function synthesizeSpeech(text) {
    if('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    } else {
        updateStatus('Text-to-speech not supported in this browser', 'error');
    }
}
