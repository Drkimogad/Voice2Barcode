const RECORDING_DURATION = 10000; // 10 seconds
const MAX_QR_DATA_LENGTH = 2953; // Max data for QR v40-L (low error correction)

let recorder;
let recordedChunks = [];
let qrCodeUrl;
let cleanupAudioModule = () => {};

async function initializeAudioModule() {
  try {
    // Do not initialize the microphone here
    console.log('Audio module initialized (microphone not accessed yet)');
    return true;
  } catch (error) {
    updateStatus(`Microphone access denied: ${error}`, 'error');
    throw error;
  }
}

async function startRecording() {
  if (recorder && recorder.state === 'recording') return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Initialize OpusRecorder only when recording starts
    recorder = new Recorder({
      encoderPath: './libs/opus-recorder/src/encoderWorker.min.js',
      decoderPath: './libs/opus-recorder/src/decoderWorker.min.js',
      numberOfChannels: 1,
      encoderSampleRate: 48000,
      encoderBitRate: 64000,
    });

    recorder.ondataavailable = (blob) => {
      recordedChunks.push(blob);
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'audio/ogg; codecs=opus' });
      await compressAndConvertToQRCode(blob);
      recordedChunks = [];
    };

    cleanupAudioModule = () => {
      stream.getTracks().forEach(track => track.stop());
      console.log('Audio module cleaned up');
    };

    recordedChunks = [];
    recorder.start();
    updateStatus('Recording started...', 'info');

    setTimeout(() => {
      if (recorder.state === 'recording') {
        stopRecording();
        updateStatus('Recording stopped automatically', 'warning');
      }
    }, RECORDING_DURATION);
  } catch (error) {
    updateStatus(`Failed to start recording: ${error}`, 'error');
  }
}

function stopRecording() {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    updateStatus('Recording stopped', 'success');
  }
}

async function compressAndConvertToQRCode(blob) {
  try {
    updateStatus('Compressing audio...', 'info');
    
    // Convert Opus audio blob to base64
    const base64Data = await blobToBase64(blob);
    const compressedData = base64Data.slice(0, MAX_QR_DATA_LENGTH);

    updateStatus('Generating QR code...', 'info');
    const qrCodeCanvas = document.getElementById('qrcode');
    
    await new Promise((resolve, reject) => {
      QRCode.toCanvas(qrCodeCanvas, compressedData, error => {
        if (error) reject(error);
        else resolve();
      });
    });

    qrCodeUrl = qrCodeCanvas.toDataURL();
    updateStatus('QR code ready!', 'success');
  } catch (error) {
    updateStatus(`QR generation failed: ${error.message}`, 'error');
  }
}

function handleQRDownload() {
  if (!qrCodeUrl) {
    updateStatus('No QR code available', 'error');
    return;
  }

  const link = document.createElement('a');
  link.download = `audioqr-${Date.now()}.png`;
  link.href = qrCodeUrl;
  link.click();
  updateStatus('QR code downloaded', 'success');
}

function updateStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = `status-${type}`;
  
  // Auto-clear success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = '';
    }, 5000);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Cleanup when closing/page unload
window.addEventListener('beforeunload', () => {
  if (cleanupAudioModule) cleanupAudioModule();
});

// Expose public functions
window.initializeAudioModule = initializeAudioModule;
window.initializeRecordingControls = initializeRecordingControls;
window.handleQRDownload = handleQRDownload;
