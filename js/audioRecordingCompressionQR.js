// audioRecordingCompressionQR.js

const RECORDING_DURATION = 10000; // 10 seconds in milliseconds

let recorder;
let recordedChunks = [];
let qrCodeUrl;

function initializeAudioModule() {
    return new Promise((resolve, reject) => {
        try {
            // Initialize media recorder
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    recorder = new MediaRecorder(stream);
                    
                    recorder.ondataavailable = event => {
                        if (event.data.size > 0) {
                            recordedChunks.push(event.data);
                        }
                    };

                    recorder.onstop = () => {
                        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                        compressAndConvertToQRCode(blob);
                    };

                    console.log('Audio Module initialized');
                    resolve(() => {
                        // Cleanup code for Audio Module
                        console.log('Audio Module cleaned up');
                        stream.getTracks().forEach(track => track.stop());
                    });
                })
                .catch(error => {
                    console.error('Audio Module initialization failed:', error);
                    reject(error);
                });
        } catch (error) {
            console.error('Audio Module initialization failed:', error);
            reject(error);
        }
    });
}

function initializeRecordingControls() {
    return new Promise((resolve, reject) => {
        try {
            const startButton = document.getElementById('startRecordingBtn');
            const stopButton = document.getElementById('stopRecordingBtn');

            startButton.addEventListener('click', startRecording);
            stopButton.addEventListener('click', stopRecording);

            console.log('Recording Controls initialized');
            resolve(() => {
                // Cleanup code for Recording Controls
                console.log('Recording Controls cleaned up');
                startButton.removeEventListener('click', startRecording);
                stopButton.removeEventListener('click', stopRecording);
            });
        } catch (error) {
            console.error('Recording Controls initialization failed:', error);
            reject(error);
        }
    });
}

function startRecording() {
    recordedChunks = [];
    recorder.start();
    console.log('Recording started');

    setTimeout(() => {
        if (recorder.state === 'recording') {
            recorder.stop();
            console.log('Recording stopped automatically after 10 seconds');
        }
    }, RECORDING_DURATION);
}

function stopRecording() {
    if (recorder.state === 'recording') {
        recorder.stop();
        console.log('Recording stopped manually');
    }
}

function compressAndConvertToQRCode(blob) {
    // Placeholder for compression logic
    console.log('Compressing audio...');

    // Placeholder for QR code generation logic
    console.log('Converting to QR code...');

    const reader = new FileReader();
    reader.onload = () => {
        const audioData = reader.result;

        // Generate QR code from the audio data
        const qrCodeCanvas = document.getElementById('qrcode');
        QRCode.toCanvas(qrCodeCanvas, audioData, error => {
            if (error) {
                console.error('QR code generation failed:', error);
            } else {
                console.log('QR code generated successfully');
                qrCodeUrl = qrCodeCanvas.toDataURL();
            }
        });
    };

    reader.readAsDataURL(blob);
}

function handleQRDownload() {
    if (!qrCodeUrl) {
        throw new Error('No QR code available');
    }

    const link = document.createElement('a');
    link.download = `v2b-${Date.now()}.png`;
    link.href = qrCodeUrl;
    link.click();
    URL.revokeObjectURL(qrCodeUrl);
    updateStatus('QR code downloaded', 'success');
}

// Expose functions to the global scope
window.initializeAudioModule = initializeAudioModule;
window.initializeRecordingControls = initializeRecordingControls;
window.handleQRDownload = handleQRDownload;
