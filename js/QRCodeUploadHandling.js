// QR Code Upload Handling
document.getElementById('qrUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return updateStatus('No file selected!', 'error');

    try {
        const qrData = await decodeQRFromImage(file);
        handleScannedQR(qrData);
        updateStatus('QR Code uploaded and decoded!', 'success');
    } catch (err) {
        updateStatus('Failed to decode QR code: ' + err.message, 'error');
    }
});

// Decode QR Code from Image
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

// Handle Scanned QR
function handleScannedQR(content) {
    try {
        const decrypted = SecurityHandler.decrypt(content);
        if (decrypted.startsWith('text:')) {
            const text = decrypted.slice(5);
            document.getElementById('scannedMessage').style.display = 'block';
            document.getElementById('messageText').textContent = text;
            synthesizeSpeech(text);
        } else if (decrypted.startsWith('audio:')) {
            const audio = new Audio(`data:audio/ogg;base64,${decrypted.slice(6)}`);
            audio.controls = true;
            document.getElementById('scannedAudio').innerHTML = '';
            document.getElementById('scannedAudio').appendChild(audio);
            document.getElementById('scannedMessage').style.display = 'block';
            document.getElementById('messageText').textContent = 'Audio decoded successfully!';
        } else {
            throw new Error('Unsupported QR data format');
        }
        updateStatus('Content decoded successfully!', 'success');
    } catch (err) {
        updateStatus('Decoding failed: ' + err.message, 'error');
    }
}
