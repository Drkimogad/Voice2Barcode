// TTS Functionality - Generate speech and QR code
document.getElementById('textConvertBtn').addEventListener('click', function () {
    const text = document.getElementById('textToConvert').value;
    const maleVoiceSelect = document.getElementById('maleVoiceSelect');
    const femaleVoiceSelect = document.getElementById('femaleVoiceSelect');
    const selectedVoiceName = maleVoiceSelect.value || femaleVoiceSelect.value;

    if (!text || !selectedVoiceName) {
        updateStatus('Please enter text and select a voice.', 'error');
        return;
    }

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices();

        // Select the voice
        utterance.voice = voices.find(voice => voice.name === selectedVoiceName);

        // Speak the text
        speechSynthesis.speak(utterance);

        // Generate QR code containing the speech
        generateQRCodeFromTextToSpeech(text, utterance.voice);
    } else {
        updateStatus('Text-to-speech not supported in this browser', 'error');
    }
});

// Function to generate QR code from text-to-speech
function generateQRCodeFromTextToSpeech(text, voice) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = ''; // Clear any existing QR code

    // Generate audio data from text
    const audioURL = generateAudioData(text, voice);

    // Create the QR code with the audio URL
    new QRCode(qrcodeDiv, {
        text: audioURL,
        width: 200,
        height: 200
    });

    // Enable the download button
    document.getElementById('downloadBtn').disabled = false;
}

// Function to generate audio data from the text-to-speech
function generateAudioData(text, voice) {
    // Create an Audio context to play the speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;

    // Create an Audio object and set the source to the audio generated from speech
    const audio = new Audio();
    audio.src = URL.createObjectURL(utterance);

    // Return the audio URL to be encoded in the QR code
    return audio.src;
}

// Download QR Code and Audio
document.getElementById('downloadBtn').addEventListener('click', function () {
    const qrcodeCanvas = document.querySelector('#qrcode canvas');
    if (qrcodeCanvas) {
        const link = document.createElement('a');
        link.href = qrcodeCanvas.toDataURL('image/png');
        link.download = 'qrcode.png';
        link.click();
        updateStatus('QR Code downloaded!', 'success');
    } else {
        updateStatus('No QR Code to download!', 'error');
    }
});

// Update Status
function updateStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
}
