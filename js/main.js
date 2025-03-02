// In main.js
import { initializeQRUploadHandlers } from './js/QRCodeUploadHandling.js';
import { generateQRFromData } from './js/audioRecordingCompressionQR.js';
import { initializeQRScanner } from './js/QRScanning.js';
initializeQRScanner();

document.addEventListener('DOMContentLoaded', () => {
    // Existing initializations
    initializeQRUploadHandlers();
    
    // QR Download Handler
    document.getElementById('downloadQRCodeBtn').addEventListener('click', () => {
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'voice-barcode.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    });
});
