// QR Code Upload Handling
document.getElementById('qrUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return updateStatus('No file selected!', 'error');

    try {
        const qrData = await decodeQRFromImage(file);
        handleScannedQR(qrData); // Handle the decoded QR data
        updateStatus('QR Code uploaded and decoded!', 'success');
    } catch (err) {
        updateStatus('Failed to decode QR code: ' + err.message, 'error');
    }
});

// Audio Upload Handling
document.getElementById('audioUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return updateStatus('No file selected!', 'error');

    try {
        const audioData = await file.arrayBuffer();
        const audioBlob = new Blob([audioData], { type: 'audio/webm' });
        const compressedAudio = await compressAudio(audioBlob);
        const encryptedData = SecurityHandler.encrypt(`audio:${compressedAudio}`);
        generateQRFromData(encryptedData); // Generate the QR code for the uploaded audio
        updateStatus('Audio file uploaded and QR generated!', 'success');
    } catch (err) {
        updateStatus('Failed to process audio: ' + err.message, 'error');
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

// Handle Scanned QR Data (Decoding)
function handleScannedQR(content) {
    try {
        const decrypted = SecurityHandler.decrypt(content);
        if (decrypted.startsWith('text:')) {
            const text = decrypted.slice(5);
            document.getElementById('scannedMessage').style.display = 'block';
            document.getElementById('messageText').textContent = text;
            synthesizeSpeech(text); // Play the speech for the decoded text
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
        generateQRFromData(content);  // Generate a QR code for the decoded content
        updateStatus('Content decoded successfully!', 'success');
    } catch (err) {
        updateStatus('Decoding failed: ' + err.message, 'error');
    }
}

// Generate QR Code from Data (audio or text)
function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = ''; // Clear previous QR code

    // Generate the QR code with the provided data (encrypted audio or decoded content)
    new QRCode(qrcodeDiv, {
        text: data,
        width: 200,
        height: 200
    });

    // Enable the download button once QR code is generated
    document.getElementById('downloadQRCodeBtn').disabled = false;
}

// Compress Audio (Using Opus Encoder)
async function compressAudio(audioBlob) {
    const encoder = new OpusEncoder();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const compressed = await encoder.encode(arrayBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}

// Download QR Code
document.getElementById('downloadQRCodeBtn').addEventListener('click', function () {
    const qrcodeCanvas = document.querySelector('#qrcode canvas');
    if (qrcodeCanvas) {
        const link = document.createElement('a');
        link.href = qrcodeCanvas.toDataURL('image/png');
        link.download = 'qrcode.png';
        link.click();
        updateStatus('QR Code downloaded!', 'success');
    } else {
        updateStatus('No QR Code to download!', 'error');
    }
}

// Update Status Message
function updateStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
}
