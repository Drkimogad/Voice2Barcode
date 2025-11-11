// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Display status message to user
 * @param {string} message - Message to display
 * @param {string} type - Type of message (info, success, error, warning)
 */
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    // Map your new color types to existing styles
    const typeMap = {
        'silver': 'info',      // Silver-Metallic for processing
        'brick': 'warning',    // Brick for warnings
        'charcoal': 'success', // Charcoal for success
        'cream': 'info',       // Cream for normal info
        'info': 'info',        // Keep existing
        'success': 'success',  // Keep existing  
        'warning': 'warning',  // Keep existing
        'error': 'error'       // Keep existing
    };

    const mappedType = typeMap[type] || 'info';
    
    statusElement.textContent = message;
    statusElement.className = `status-message status-${mappedType}`;
    statusElement.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (mappedType === 'success') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
            statusElement.style.display = 'none';
        }, 5000);
    }
}

/**
 * Toggle loading overlay
 * @param {boolean} visible - Show or hide loading
 * @param {string} text - Optional loading text
 */
function toggleLoading(visible, text = 'Processing...') {
    const loader = document.getElementById('loadingOverlay');
    if (!loader) return;

    const loadingText = loader.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = text;

    loader.style.display = visible ? 'flex' : 'none';
    loader.setAttribute('aria-busy', visible.toString());
}



/**
 * Convert Blob to Base64 string
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64 string
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}


/**
 * Trigger file download
 * @param {string} url - Data URL or blob URL
 * @param {string} filename - Filename for download
 */
function triggerDownload(url, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }, 100);
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clear all user data from storage
 */
function clearAllStorage() {
    localStorage.clear();
    sessionStorage.clear();
}

/**
 * Get timestamp in ISO format
 * @returns {string} ISO timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Check if browser supports required APIs
 * @returns {object} Support status
 */
function checkBrowserSupport() {
    return {
        mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        speechSynthesis: !!window.speechSynthesis,
        canvas: !!document.createElement('canvas').getContext,
        localStorage: !!window.localStorage,
        fileReader: !!window.FileReader
    };
}

/**
 * Display error in console and to user
 * @param {string} context - Context of the error
 * @param {Error} error - Error object
 */
function handleError(context, error) {
    console.error(`[${context}]`, error);
    updateStatus(`${context}: ${error.message}`, 'error');
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

console.log('✅ Utils.js loaded successfully');




