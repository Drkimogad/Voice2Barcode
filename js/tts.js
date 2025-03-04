// tts.js - Final Version
let synth = window.speechSynthesis;
let voices = [];

export function initializeTTS() {
    // Load available voices
    synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        populateVoiceSelects();
    };

    // Initialize TTS button
    const textConvertBtn = document.getElementById('textConvertBtn');
    textConvertBtn.addEventListener('click', handleTextConversion);

    return () => {
        textConvertBtn.removeEventListener('click', handleTextConversion);
    };
}

function populateVoiceSelects() {
    const maleSelect = document.getElementById('maleVoiceSelect');
    const femaleSelect = document.getElementById('femaleVoiceSelect');

    // Clear existing options
    maleSelect.innerHTML = '<option value="">Select Male Voice</option>';
    femaleSelect.innerHTML = '<option value="">Select Female Voice</option>';

    // Populate voice options
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        option.dataset.lang = voice.lang;
        option.dataset.gender = voice.gender || 'unknown';

        if (voice.gender === 'male') {
            maleSelect.appendChild(option);
        } else if (voice.gender === 'female') {
            femaleSelect.appendChild(option);
        }
    });
}

function handleTextConversion() {
    const text = document.getElementById('textToConvert').value;
    const voiceName = document.querySelector('.voice-select').value;

    if (!text || !voiceName) {
        updateStatus('Please enter text and select a voice', 'error');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find(v => v.name === voiceName);
    utterance.onend = () => generateQRFromText(text, voiceName);

    synth.speak(utterance);
    updateStatus('Converting text to speech...', 'info');
}

function generateQRFromText(text, voiceName) {
    try {
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = '';
        new QRCode(qrcodeDiv, {
            text: JSON.stringify({ type: 'text', data: text, voice: voiceName }),
            width: 256,
            height: 256
        });
        document.getElementById('downloadQRCodeBtn').disabled = false;
        updateStatus('QR code generated!', 'success');
    } catch (error) {
        updateStatus(`QR code generation failed: ${error.message}`, 'error');
    }
}
