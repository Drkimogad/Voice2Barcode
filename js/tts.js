// tts.js
let synth = window.speechSynthesis;
let voices = [];

function initializeTTS() {
    const textConvertBtn = document.getElementById('textConvertBtn');
    
    synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        populateVoiceSelects();
    };

    textConvertBtn.addEventListener('click', handleTextConversion);

    return () => {
        textConvertBtn.removeEventListener('click', handleTextConversion);
    };
}

function populateVoiceSelects() {
    const maleSelect = document.getElementById('maleVoiceSelect');
    const femaleSelect = document.getElementById('femaleVoiceSelect');

    maleSelect.innerHTML = '<option value="">Select Male Voice</option>';
    femaleSelect.innerHTML = '<option value="">Select Female Voice</option>';

    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        
        // Improved voice gender detection
        const voiceGender = voice.voiceURI.toLowerCase().includes('male') ? 'male' : 
                          voice.voiceURI.toLowerCase().includes('female') ? 'female' : 
                          'unknown';

        if (voiceGender === 'male') {
            maleSelect.appendChild(option);
        } else if (voiceGender === 'female') {
            femaleSelect.appendChild(option);
        }
    });
}

function handleTextConversion() {
    const text = document.getElementById('textToConvert').value;
    const maleVoice = document.getElementById('maleVoiceSelect').value;
    const femaleVoice = document.getElementById('femaleVoiceSelect').value;
    const selectedVoice = maleVoice || femaleVoice;

    if (!text || !selectedVoice) {
        updateStatus('Please enter text and select a voice', 'error');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find(v => v.name === selectedVoice);
    
    utterance.onend = () => {
        generateQRFromText(text, selectedVoice);
    };

    utterance.onerror = (error) => {
        updateStatus(`TTS Error: ${error.error}`, 'error');
    };

    synth.speak(utterance);
    updateStatus('Converting text to speech...', 'info');
}

function generateQRFromText(text, voiceName) {
    try {
        const qrData = {
            type: 'text',
            data: text,
            voice: voiceName,
            timestamp: new Date().toISOString()
        };

        const qrCodeCanvas = document.getElementById('qrcode');
        QRCode.toCanvas(qrCodeCanvas, JSON.stringify(qrData), (error) => {
            if (error) throw error;
            document.getElementById('downloadQRCodeBtn').disabled = false;
            updateStatus('QR code generated!', 'success');
        });
    } catch (error) {
        updateStatus(`QR generation failed: ${error.message}`, 'error');
    }
}

window.initializeTTS = initializeTTS;
