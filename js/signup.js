'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const errorDisplay = document.getElementById('errorMessage');

    signupForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        errorDisplay.textContent = '';

        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        try {
            // Basic validation
            if (!username || !email || !password) throw new Error('All fields are required');

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
    document.getElementById('signupPassword').value = '';
}
