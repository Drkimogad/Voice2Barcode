// QRCodeUploadHandling.js
export function initializeQRUploadHandlers() {
    // QR Code Upload
    document.getElementById('qrUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return updateStatus('No file selected!', 'error');

        try {
            const qrData = await decodeQRFromImage(file);
            const decryptedData = SecurityHandler.decrypt(qrData);
            handleScannedContent(decryptedData);
            updateStatus('QR Code processed successfully!', 'success');
        } catch (err) {
            updateStatus(`QR Error: ${err.message}`, 'error');
        } finally {
            URL.revokeObjectURL(file); // Clean up memory
        }
    });

    // Audio Upload
    document.getElementById('audioUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return updateStatus('No file selected!', 'error');

        try {
            const audioBlob = new Blob([await file.arrayBuffer()], { type: file.type });
            const compressed = await compressAudio(audioBlob);
            const encrypted = SecurityHandler.encrypt(compressed);
            generateQRFromData(encrypted);
            updateStatus('Audio encoded in QR!', 'success');
        } catch (err) {
            updateStatus(`Audio Error: ${err.message}`, 'error');
        }
    });
}

// QR Decoding
async function decodeQRFromImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            [canvas.width, canvas.height] = [img.width, img.height];
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            
            result ? resolve(result.data) : reject(new Error('No QR code found'));
        };
        
        img.onerror = () => reject(new Error('Invalid image file'));
    });
}

// Content Handling
function handleScannedContent(content) {
    try {
        const container = document.getElementById('scannedContent');
        const messageEl = document.getElementById('messageText');
        const audioEl = document.getElementById('scannedAudio');

        container.style.display = 'block';
        
        if (content.startsWith('text:')) {
            messageEl.textContent = content.slice(5);
            audioEl.innerHTML = '';
        } else if (content.startsWith('audio:')) {
            audioEl.innerHTML = `<audio controls src="data:audio/webm;base64,${content.slice(6)}"></audio>`;
            messageEl.textContent = 'Decoded audio message';
        } else {
            throw new Error('Unknown content type');
        }
    } catch (err) {
        throw new Error(`Content handling failed: ${err.message}`);
    }
}
