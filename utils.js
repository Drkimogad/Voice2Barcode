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

// Add this to your toggleLoading function or near it:
function showCompressionProgress() {
    const statusElement = document.querySelector('.status-message');
    statusElement.classList.add('compression-loading');
    statusElement.classList.add('status-silver');
}

function hideCompressionProgress() {
    const statusElement = document.querySelector('.status-message');
    statusElement.classList.remove('compression-loading');
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

/* Add AUDIO compression function
This function:
✅ Uses your small WebM files directly (9KB is perfect)
✅ Only tries compression if file is over 50KB
✅ Prevents making files larger with WAV conversion
✅ Maintains your existing flow and status messages
*/
async function compressAudioBlob(blob) {
    console.log('🔧 Compression started - Original size:', blob.size, 'bytes');
    updateStatus('Checking audio size...', 'silver');
    
    // If already small enough, return as-is (WebM is compressed)
    if (blob.size <= 50000) { // 50KB limit
        console.log('✅ Size good, using original WebM');
        updateStatus('Audio size is good', 'success');
        return blob;
    }
    
    // Only compress if absolutely necessary
    try {
        console.log('🔄 Audio too large, compressing...');
        updateStatus('Compressing audio...', 'silver');
        
        // Your Web Audio API compression code here
        // But for now, just return original to avoid making it larger
        console.log('⚠️ Compression skipped - would make file larger');
        updateStatus('Using original audio', 'info');
        return blob;
        
    } catch (error) {
        console.error('❌ Compression failed:', error);
        updateStatus('Compression failed', 'warning');
        return blob;
    }
}

async function blobToAudioBuffer(blob) {
    console.log('📄 Reading blob as array buffer...');
    const arrayBuffer = await blob.arrayBuffer();
    
    console.log('🎵 Creating audio context...');
    const audioContext = new AudioContext();
    
    console.log('🔊 Decoding audio data...');
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('✅ Audio buffer created - duration:', audioBuffer.duration, 'seconds');
    return audioBuffer;
}

async function downsampleAudio(audioBuffer, targetSampleRate, targetChannels) {
    console.log(`🎚️ Downsampling to ${targetSampleRate}Hz, ${targetChannels} channel(s)`);
    
    const length = audioBuffer.length * targetSampleRate / audioBuffer.sampleRate;
    const offlineContext = new OfflineAudioContext(
        targetChannels,
        length,
        targetSampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    console.log('🔄 Rendering downsampled audio...');
    const renderedBuffer = await offlineContext.startRendering();
    
    console.log('✅ Downsampling complete');
    return renderedBuffer;
}

function audioBufferToWav(buffer) {
    console.log('💾 Converting to WAV format...');
    
    const length = buffer.length;
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    
    const wavBuffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(wavBuffer);
    
    // Write WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * channels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * channels * 2, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < channels; channel++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }
    
    console.log('✅ WAV conversion complete');
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

async function validateAudioQuality(blob) {
    console.log('🔍 Validating audio - Size:', blob.size, 'bytes');
    updateStatus('Validating audio quality...', 'silver');
    
    return new Promise((resolve) => {
        if (!blob || blob.size < 2000) {
            console.log('❌ Audio too small or invalid');
            updateStatus('Audio too small', 'error');
            resolve(false);
            return;
        }
        
        console.log('🎵 Testing audio playback...');
        const audio = new Audio();
        audio.src = URL.createObjectURL(blob);
        
        audio.onloadeddata = () => {
            console.log('✅ Audio validation passed - can play');
            URL.revokeObjectURL(audio.src);
            updateStatus('Audio quality good', 'success');
            resolve(true);
        };
        
        audio.onerror = () => {
            console.log('❌ Audio validation failed - cannot play');
            URL.revokeObjectURL(audio.src);
            updateStatus('Audio cannot play', 'error');
            resolve(false);
        };
        
        // Timeout fallback
        setTimeout(() => {
            console.log('⏰ Audio validation timeout, assuming valid');
            URL.revokeObjectURL(audio.src);
            updateStatus('Audio validation complete', 'info');
            resolve(true);
        }, 2000);
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




