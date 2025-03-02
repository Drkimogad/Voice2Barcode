let currentCameraIndex = 0;
let cameras = [];
let scanner;

document.getElementById('scanBtn').addEventListener('click', async () => {
    try {
        cameras = await Instascan.Camera.getCameras();
        
        if (cameras.length > 0) {
            // Initialize scanner with the first camera
            scanner = new Instascan.Scanner({ video: document.getElementById('cameraFeed') });
            
            // Listener for QR scan event
            scanner.addListener('scan', (content) => {
                handleScannedQR(content);
            });
            
            // Start the scanner with the current camera
            scanner.start(cameras[currentCameraIndex]);

            document.getElementById('cameraPreview').style.display = 'block';
            document.getElementById('switchCameraBtn').style.display = 'inline-block';
            updateStatus('Scanning QR Code...', 'success');
        } else {
            updateStatus('No cameras found!', 'error');
        }
    } catch (err) {
        updateStatus('Camera access denied!', 'error');
    }
});

// Switch Camera (front <-> rear)
document.getElementById('switchCameraBtn').addEventListener('click', () => {
    if (cameras.length > 1) {
        currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
        scanner.start(cameras[currentCameraIndex]);
        updateStatus(`Switched to ${cameras[currentCameraIndex].name}`, 'success');
    }
});

// Handle Scanned QR
function handleScannedQR(content) {
    try {
        const decrypted = SecurityHandler.decrypt(content);
        if (decrypted.startsWith('text:')) {
            const text = decrypted.slice(5);
            document.getElementById('scannedMessage').style.display = 'block';
            document.getElementById('messageText').textContent = text;
            synthesizeSpeech(text);  // Read the text aloud
            enableDownload('text', text);  // Enable download of text
        } else if (decrypted.startsWith('audio:')) {
            const audioData = decrypted.slice(6);  // Extract audio data
            const audio = new Audio(audioData);
            audio.controls = true;
            document.getElementById('scannedAudio').innerHTML = ''; // Clear any previous audio
            document.getElementById('scannedAudio').appendChild(audio);
            document.getElementById('scannedMessage').style.display = 'block';
            document.getElementById('messageText').textContent = 'Audio decoded successfully!';
            audio.play(); // Play the decoded audio
            enableDownload('audio', audioData); // Enable download of audio
        } else {
            throw new Error('Unsupported QR data format');
        }
        updateStatus('Content decoded successfully!', 'success');
    } catch (err) {
        updateStatus('Decoding failed: ' + err.message, 'error');
    }
}

// Enable Download (for text or audio)
function enableDownload(type, data) {
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = false;
    downloadBtn.addEventListener('click', () => {
        if (type === 'text') {
            downloadText(data);  // Download text file
        } else if (type === 'audio') {
            downloadAudio(data);  // Download audio file
        }
    });
}

// Download Text (as .txt file)
function downloadText(text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scannedText.txt';
    link.click();
    updateStatus('Text downloaded successfully!', 'success');
}

// Download Audio (as .ogg or .mp3 file)
function downloadAudio(audioData) {
    const blob = new Blob([audioData], { type: 'audio/ogg' }); // You can change the MIME type to your preferred format
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scannedAudio.ogg';
    link.click();
    updateStatus('Audio downloaded successfully!', 'success');
}

// Update Status
function updateStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
}
