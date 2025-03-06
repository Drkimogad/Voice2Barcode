let scanner = null;
let currentCameraIndex = 0;
let cameras = [];

function initializeScanner() {
    const scanBtn = document.getElementById('scanBtn');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    
    scanBtn.addEventListener('click', startScanner);
    switchCameraBtn.addEventListener('click', switchCamera);

    return () => {
        stopScanner();
        scanBtn.removeEventListener('click', startScanner);
        switchCameraBtn.removeEventListener('click', switchCamera);
    };
}

async function startScanner() {
    try {
        cameras = await Instascan.Camera.getCameras();
        if (cameras.length === 0) {
            throw new Error('No cameras found');
        }

        scanner = new Instascan.Scanner({
            video: document.getElementById('cameraFeed'),
            mirror: false,
            backgroundScan: false
        });

        scanner.addListener('scan', handleScan);
        await scanner.start(cameras[currentCameraIndex]);

        document.getElementById('cameraPreview').hidden = false;
        document.getElementById('switchCameraBtn').hidden = cameras.length <= 1;
        updateStatus('Scanning started', 'success');
    } catch (error) {
        updateStatus(`Scanner error: ${error.message}`, 'error');
    }
}

function stopScanner() {
    if (scanner) {
        scanner.stop();
        scanner = null;
    }
    document.getElementById('cameraPreview').hidden = true;
}

function switchCamera() {
    currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
    scanner.start(cameras[currentCameraIndex]);
    updateStatus(`Switched to ${cameras[currentCameraIndex].name}`, 'info');
}

function handleScan(content) {
    try {
        const data = JSON.parse(content);
        displayScannedContent(data);
        document.getElementById('downloadBtn').disabled = false;
        window.lastScannedData = data; // Store for download
    } catch (error) {
        updateStatus('Invalid QR code content', 'error');
    }
}

function displayScannedContent(data) {
    const scannedContent = document.getElementById('scannedContent');
    const messageText = document.getElementById('messageText');
    const scannedAudio = document.getElementById('scannedAudio');

    scannedContent.hidden = false;
    scannedAudio.innerHTML = '';
    messageText.textContent = '';

    if (data.type === 'text') {
        messageText.textContent = data.data;
    } else if (data.type === 'audio') {
        const audio = new Audio(data.data);
        audio.controls = true;
        scannedAudio.appendChild(audio);
        messageText.textContent = `Audio content (${data.mimeType})`;
    } else {
        updateStatus('Unsupported content type', 'error');
    }
}

function downloadDecodedContent() {
    const data = window.lastScannedData;
    if (!data) return;

    try {
        let blob, filename;
        if (data.type === 'text') {
            blob = new Blob([data.data], { type: 'text/plain' });
            filename = 'decoded_text.txt';
        } else if (data.type === 'audio') {
            const byteString = atob(data.data.split(',')[1]);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const uintArray = new Uint8Array(arrayBuffer);
            for (let i = 0; i < byteString.length; i++) {
                uintArray[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([arrayBuffer], { type: data.mimeType });
            filename = `audio_${Date.now()}.${data.mimeType.split('/')[1]}`;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        updateStatus(`Download failed: ${error.message}`, 'error');
    }
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status-${type}`;
    if (type === 'success') setTimeout(() => statusElement.textContent = '', 5000);
}

window.initializeScanner = initializeScanner;
window.downloadDecodedContent = downloadDecodedContent;
