// tts.js
(function() {
    let synth = window.speechSynthesis;
    let voices = [];
    let audioContext;

    function populateVoiceList() {
        const maleSelect = document.getElementById('maleVoiceSelect');
        const femaleSelect = document.getElementById('femaleVoiceSelect');
        
        // Clear existing options
        maleSelect.innerHTML = '<option value="">Select Male Voice</option>';
        femaleSelect.innerHTML = '<option value="">Select Female Voice</option>';
        
        synth.getVoices().forEach(voice => {
            const option = new Option(`${voice.name} (${voice.lang})`, voice.name);
            if (voice.gender === 'male') maleSelect.add(option);
            else if (voice.gender === 'female') femaleSelect.add(option);
        });
    }

    window.initializeTTS = function() {
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = populateVoiceList;
        }
        
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported');
        }

        document.getElementById('textConvertBtn').addEventListener('click', async function() {
            const text = document.getElementById('textToConvert').value;
            const voiceName = document.querySelector('.voice-select').value;
            
            if (!text || !voiceName) {
                updateStatus('Please enter text and select a voice', 'error');
                return;
            }
            
            try {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = synth.getVoices().find(v => v.name === voiceName);
                
                const audioBlob = await new Promise(resolve => {
                    const chunks = [];
                    const mediaRecorder = new MediaRecorder(
                        new MediaStream([utterance.audioStream])
                    );
                    
                    mediaRecorder.ondataavailable = e => chunks.push(e.data);
                    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/wav' }));
                    
                    mediaRecorder.start();
                    synth.speak(utterment);
                    utterance.onend = () => mediaRecorder.stop();
                });

                const audioURL = URL.createObjectURL(audioBlob);
                new QRCode(document.getElementById('qrcode'), {
                    text: JSON.stringify({
                        text,
                        voice: voiceName,
                        audio: audioURL
                    }),
                    width: 256,
                    height: 256
                });
                
                updateStatus('QR Code generated!', 'success');
                document.getElementById('downloadQRCodeBtn').disabled = false;
                
            } catch (error) {
                updateStatus(`Error: ${error.message}`, 'error');
            }
        });
    };
})();
