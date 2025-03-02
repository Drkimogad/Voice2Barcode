//Handling Audio Upload:
document.getElementById('audioUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return updateStatus('No file selected!', 'error');

    try {
        const audioData = await fileToDataURL(file); // Convert file to Data URL
        const qrCodeData = generateQRDataFromAudio(audioData); // Generate QR Code data from audio
        generateQRFromData(qrCodeData); // Display the generated QR code
        updateStatus('Audio uploaded and QR code generated!', 'success');
        
        // Enable QR code download
        document.getElementById('downloadQRCodeBtn').disabled = false;
        document.getElementById('downloadQRCodeBtn').addEventListener('click', () => {
            downloadQR(qrCodeData);
        });
    } catch (err) {
        updateStatus('Failed to process audio file: ' + err.message, 'error');
    }
});

// Convert file to base64 data URL
async function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Generate QR code data from audio data URL
function generateQRDataFromAudio(audioData) {
    // Encrypt or encode audio data (Optional: Encrypt it based on your need)
    const encryptedData = SecurityHandler.encrypt(`audio:${audioData}`);
    return encryptedData;
}

// Generate QR Code from data
function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = ''; // Clear previous QR code
    new QRCode(qrcodeDiv, {
        text: data,
        width: 200,
        height: 200
    });
}

// Function to download the QR code
function downloadQR(data) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    link.download = 'qr_code_with_audio.json';
    link.click();
}

//Handling QR Code Upload:
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
            synthesizeSpeech(text);  // Speak the decoded text
        } else if (decrypted.startsWith('audio:')) {
            const audioData = decrypted.slice(6);  // Get the audio data
            const audio = new Audio(audioData);
            audio.controls = true;
            document.getElementById('scannedAudio').innerHTML = '';
            document.getElementById('scannedAudio').appendChild(audio);
            document.getElementById('scannedMessage').style.display = 'block';
            document.getElementById('messageText').textContent = 'Audio decoded successfully!';
            audio.play(); // Play the decoded audio
        } else {
            throw new Error('Unsupported QR data format');
        }
        updateStatus('Content decoded successfully!', 'success');
    } catch (err) {
        updateStatus('Decoding failed: ' + err.message, 'error');
    }
}

