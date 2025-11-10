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

    statusElement.textContent = message;
    statusElement.className = `status-message status-${type}`;
    statusElement.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
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

// Add AUDIO compression function
async function compressAudioBlob(blob) {
    updateStatus('Compressing audio...', 'info');
    
    // If already small enough, return as-is
    if (blob.size <= 30000) { // 30KB target
        return blob;
    }
    
    try {
        // Convert to lower quality audio
        const audioContext = new AudioContext();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create new buffer with lower sample rate
        const offlineContext = new OfflineAudioContext(
            1, // mono
            audioBuffer.duration * 11025, // 11.025 kHz (half of 22.05kHz)
            11025
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert back to blob
        const wavBlob = await audioBufferToWav(renderedBuffer);
        return wavBlob;
        
    } catch (error) {
        console.warn('Compression failed, using original:', error);
        return blob; // Fallback to original
    }
}

// add audio to wave converter
function audioBufferToWav(buffer) {
    return new Promise((resolve) => {
        const length = buffer.length;
        const wavBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(wavBuffer);
        
        // Write WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 11025, true);
        view.setUint32(28, 11025 * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Write audio data
        const samples = buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
        
        resolve(new Blob([wavBuffer], { type: 'audio/wav' }));
    });
}

//validate audio quality
async function validateAudioQuality(blob) {
    return new Promise((resolve) => {
        if (!blob || blob.size < 2000) { // At least 2KB
            resolve(false);
            return;
        }
        
        // Quick playback test
        const audio = new Audio();
        audio.src = URL.createObjectURL(blob);
        audio.onloadeddata = () => {
            URL.revokeObjectURL(audio.src);
            resolve(true);
        };
        audio.onerror = () => resolve(false);
        
        // Timeout fallback
        setTimeout(() => resolve(true), 1000);
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




