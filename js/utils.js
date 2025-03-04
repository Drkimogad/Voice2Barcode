// utils.js
function updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-${type}`;
    }
}

// Expose function to the global scope
window.updateStatus = updateStatus;
