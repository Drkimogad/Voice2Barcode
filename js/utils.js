// utils.js - Enhanced Version
let statusTimeout = null;
let statusQueue = [];
let isStatusVisible = false;

const STATUS_CONFIG = {
    types: {
        info: { timeout: 5000, class: 'status-info' },
        success: { timeout: 4000, class: 'status-success' },
        warning: { timeout: 6000, class: 'status-warning' },
        error: { timeout: 8000, class: 'status-error' }
    },
    animationDuration: 300,
    maxMessages: 5,
    cooldown: 100
};

function createStatusElement() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'status';
    statusDiv.className = 'status-message';
    statusDiv.setAttribute('aria-live', 'polite');
    statusDiv.setAttribute('role', 'status');
    document.body.prepend(statusDiv);
    return statusDiv;
}

function processQueue() {
    if (statusQueue.length === 0 || isStatusVisible) return;
    
    const { message, options } = statusQueue.shift();
    showStatus(message, options);
}

function showStatus(message, options = {}) {
    const statusDiv = document.getElementById('status') || createStatusElement();
    const { type = 'info', timeout, persistent = false } = options;
    
    // Clear previous state
    statusDiv.classList.remove(...Object.values(STATUS_CONFIG.types).map(t => t.class));
    statusDiv.style.animation = '';
    
    // Apply new state
    statusDiv.textContent = message;
    statusDiv.classList.add(STATUS_CONFIG.types[type].class);
    statusDiv.style.animation = `slideIn ${STATUS_CONFIG.animationDuration}ms ease-out`;
    
    // Set visibility state
    isStatusVisible = true;
    
    // Handle auto-dismiss
    if (!persistent) {
        const dismissTime = timeout || STATUS_CONFIG.types[type].timeout;
        statusTimeout = setTimeout(() => {
            statusDiv.style.animation = `slideOut ${STATUS_CONFIG.animationDuration}ms ease-in`;
            setTimeout(() => {
                statusDiv.textContent = '';
                isStatusVisible = false;
                processQueue();
            }, STATUS_CONFIG.animationDuration);
        }, dismissTime);
    }
}

function updateStatus(message, options = {}) {
    // Queue management
    if (statusQueue.length >= STATUS_CONFIG.maxMessages) {
        statusQueue.shift();
    }
    
    statusQueue.push({
        message,
        options: {
            type: 'info',
            ...options
        }
    });
    
    // Cooldown mechanism
    if (!isStatusVisible) {
        setTimeout(processQueue, STATUS_CONFIG.cooldown);
    }
}

// Export function
window.updateStatus = updateStatus;
