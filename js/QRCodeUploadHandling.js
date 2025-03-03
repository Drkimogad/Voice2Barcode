// QRCodeUploadHandling.js - Final Version
export function initializeQRUploadHandlers() {
    const audioUpload = document.getElementById('audioUpload');
    const qrUpload = document.getElementById('qrUpload');

    audioUpload.addEventListener('change', handleAudioUpload);
    qrUpload.addEventListener('change', handleQRUpload);

    return () => {
        audioUpload.removeEventListener('change', handleAudioUpload);
        qrUpload.removeEventListener('change', handleQRUpload);
    };
}

async function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        updateStatus('No file selected', 'error');
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBlob = new Blob([arrayBuffer], { type: file.type });
        generateQRFromData({ type: 'audio', data: URL.createObjectURL(audioBlob) });
        updateStatus('Audio file processed', 'success');
    } catch (error) {
        updateStatus(`Failed to process audio: ${error.message}`, 'error');
    }
}

async function handleQRUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        updateStatus('No file selected', 'error');
        return;
    }

    try {
        const content = await decodeQRFromImage(file);
        const data = JSON.parse(content);
        displayScannedContent(data);
    } catch (error) {
        updateStatus(`Failed to decode QR: ${error.message}`, 'error');
    }
}

async function decodeQRFromImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                resolve(code.data);
            } else {
                reject(new Error('No QR code found in image'));
            }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
    });
}

function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    new QRCode(qrcodeDiv, {
        text: JSON.stringify(data),
        width: 256,
        height: 256
    });
    document.getElementById('downloadQRCodeBtn').disabled = false;
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
