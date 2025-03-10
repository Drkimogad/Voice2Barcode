'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signinForm');
    const errorDisplay = document.getElementById('errorMessage');

    signinForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        errorDisplay.textContent = '';

        const username = document.getElementById('signinUsername').value.trim();
        const password = document.getElementById('signinPassword').value;

        try {
            // Basic validation
            if (!username || !password) throw new Error('All fields are required');

            // Save a dummy token (replace with real token from backend later)
            localStorage.setItem('authToken', 'dummy-token');

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorDisplay.textContent = error.message;
            performSecurityCleanup();
        }
    });
});

// Clear sensitive data on failure
function performSecurityCleanup() {
    document.getElementById('signinPassword').value = '';
}
