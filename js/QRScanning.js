// QRScanning.js - Final Version
let scanner = null;
let currentCameraIndex = 0;
let cameras = [];

function initializeQRScanner() {
    const scanBtn = document.getElementById('scanBtn');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    const cameraPreview = document.getElementById('cameraPreview');
    const cameraFeed = document.getElementById('cameraFeed');

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

        cameraPreview.hidden = false;
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
    } catch (error) {
        updateStatus('Invalid QR code content', 'error');
    }
}

function displayScannedContent(data) {
    const scannedContent = document.getElementById('scannedContent');
    const messageText = document.getElementById('messageText');
    const scannedAudio = document.getElementById('scannedAudio');

    scannedContent.hidden = false;

    if (data.type === 'text') {
        messageText.textContent = data.data;
        scannedAudio.innerHTML = '';
    } else if (data.type === 'audio') {
        const audio = new Audio(data.data);
        audio.controls = true;
        scannedAudio.innerHTML = '';
        scannedAudio.appendChild(audio);
        messageText.textContent = 'Audio decoded successfully!';
    } else {
        throw new Error('Unsupported content type');
    }

    updateStatus('Content decoded successfully', 'success');
}

// Expose functions to the global scope
window.initializeQRScanner = initializeQRScanner;
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.switchCamera = switchCamera;
window.handleScan = handleScan;
window.displayScannedContent = displayScannedContent;
