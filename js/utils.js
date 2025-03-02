// utils.js
export function updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-${type}`;
    }
}
