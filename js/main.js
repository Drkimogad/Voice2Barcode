// main.js - Updated with proper initialization sequence
import { initializeQRUploadHandlers } from './js/QRCodeUploadHandling.js';
import { initializeQRScanner } from './js/QRScanning.js';
import { initializeTTS } from './js/tts.js';
import { initializeModeSwitching } from './js/ModeSwitching.js';
import { initializeRecordingControls } from './js/audioRecordingCompressionQR.js';

// Global error handler
window.onerror = (message, source, lineno, colno, error) => {
    console.error(`Application Error: ${message}`, error);
    updateStatus('A critical error occurred. Please refresh.', 'error');
};

// Initialize all components
function initializeApp() {
    try {
        // Core functionality
        initializeModeSwitching();
        initializeRecordingControls();
        initializeTTS();
        initializeQRScanner();
        initializeQRUploadHandlers();

        // UI handlers
        initializeDownloadHandlers();
        initializeLogoutHandler();
        
        // Set initial mode
        document.querySelector('.mode-btn[data-mode="voice"]').click();
        
        updateStatus('App initialized successfully', 'success');
    } catch (error) {
        console.error('Initialization failed:', error);
        updateStatus('Failed to initialize application', 'error');
    }
}

// Download handlers
function initializeDownloadHandlers() {
    // QR Code Download
    document.getElementById('downloadQRCodeBtn').addEventListener('click', () => {
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            try {
                const url = canvas.toDataURL();
                const link = document.createElement('a');
                link.download = `voice-barcode-${Date.now()}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                updateStatus('QR code downloaded', 'success');
            } catch (error) {
                updateStatus('Failed to download QR', 'error');
            }
        }
    });

    // Content Download
    document.getElementById('downloadBtn').addEventListener('click', handleDownload);
}

// Logout handler
function initializeLogoutHandler() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'signin.html';
    });
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('loggedInUser')) {
        window.location.href = 'signin.html';
        return;
    }
    
    document.getElementById('logoutBtn').hidden = false;
    initializeApp();
});
