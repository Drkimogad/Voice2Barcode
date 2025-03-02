// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    if (typeof initializeModeSwitching === 'function') {
        initializeModeSwitching();
    }
    
    if (typeof initializeTTS === 'function') {
        initializeTTS();
    }
    
    if (typeof initializeQRScanner === 'function') {
        initializeQRScanner();
    }
    
    // Common status update function
    window.updateStatus = (message, type = 'info') => {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status-${type}`;
            setTimeout(() => statusDiv.textContent = '', 5000);
        }
    };
});
