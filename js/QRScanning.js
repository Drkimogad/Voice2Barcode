// QRScanning.js
export function initializeQRScanner() {
    let currentCameraIndex = 0;
    let cameras = [];
    let scanner = null;
    const scanBtn = document.getElementById('scanBtn');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    const cameraPreview = document.getElementById('cameraPreview');

    async function initializeScanner() {
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

            scanner.addListener('scan', content => {
                handleScannedQR(content);
                scanner.stop();
                cameraPreview.style.display = 'none';
            });

            await scanner.start(cameras[currentCameraIndex]);
            switchCameraBtn.style.display = cameras.length > 1 ? 'block' : 'none';
            updateStatus('Scanning active', 'success');
            
        } catch (error) {
            cameraPreview.style.display = 'none';
            updateStatus(`Scanner error: ${error.message}`, 'error');
        }
    }

    function handleScannedQR(content) {
        try {
            const decrypted = SecurityHandler.decrypt(content);
            const container = document.getElementById('scannedContent');
            const messageEl = document.getElementById('messageText');
            const audioEl = document.getElementById('scannedAudio');

            container.style.display = 'block';
            
            if (decrypted.type === 'text') {
                messageEl.textContent = decrypted.data;
                audioEl.innerHTML = '';
                enableDownload('text', decrypted.data);
            } else if (decrypted.type === 'audio') {
                const audioURL = URL.createObjectURL(
                    new Blob([base64ToArrayBuffer(decrypted.data)], { type: 'audio/webm' }
                ));
                audioEl.innerHTML = `<audio controls src="${audioURL}"></audio>`;
                messageEl.textContent = 'Decoded audio message';
                enableDownload('audio', decrypted.data);
            } else {
                throw new Error('Unsupported content type');
            }
            
            updateStatus('Decode successful', 'success');
        } catch (error) {
            updateStatus(`Decode failed: ${error.message}`, 'error');
        }
    }

    // Event Listeners
    scanBtn.addEventListener('click', async () => {
        cameraPreview.style.display = 'block';
        await initializeScanner();
    });

    switchCameraBtn.addEventListener('click', () => {
        if (cameras.length > 1) {
            currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
            scanner.start(cameras[currentCameraIndex]);
            updateStatus(`Switched to ${cameras[currentCameraIndex].name}`, 'info');
        }
    });

    // Cleanup when leaving page
    window.addEventListener('beforeunload', () => {
        if (scanner) scanner.stop();
    });
}

// Utility functions
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function enableDownload(type, data) {
    const btn = document.getElementById('downloadBtn');
    btn.disabled = false;
    
    btn.onclick = () => {
        if (type === 'text') {
            downloadText(data);
        } else if (type === 'audio') {
            downloadAudio(data);
        }
    };
}

function downloadText(text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decoded-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
}

function downloadAudio(audioData) {
    const buffer = base64ToArrayBuffer(audioData);
    const blob = new Blob([buffer], { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decoded-${Date.now()}.webm`;
    link.click();
    URL.revokeObjectURL(url);
}
