let scanner;
let currentCameraIndex = 0;
let cameras = [];

// QR Scanning
document.getElementById('scanBtn').addEventListener('click', async () => {
    try {
        cameras = await Instascan.Camera.getCameras();
        if (cameras.length > 0) {
            scanner = new Instascan.Scanner({ video: document.getElementById('cameraFeed') });
            scanner.addListener('scan', (content) => {
                handleScannedQR(content);
            });
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

// Switch Camera
document.getElementById('switchCameraBtn').addEventListener('click', () => {
    if (cameras.length > 1) {
        currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
        scanner.start(cameras[currentCameraIndex]);
        updateStatus(`Switched to ${cameras[currentCameraIndex].name}`, 'success');
    }
});
