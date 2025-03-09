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
            // Client-Side Validation
            if (!username || !password) {
                throw new Error('Please fill in both fields');
            }

            // Hardcoded Credentials Check (Replace with actual authentication logic)
            const validUsername = 'testuser';
            const validPassword = 'password123';

            if (username !== validUsername || password !== validPassword) {
                throw new Error('Invalid username or password');
            }

            // Store authentication status
            localStorage.setItem('authToken', 'dummy-token');

            // Redirect to dashboard
            window.location.replace('dashboard.html');
        } catch (error) {
            errorDisplay.textContent = error.message;
            console.error('SignIn Error:', error);
            performSecurityCleanup();
        }
    });
});

function performSecurityCleanup() {
    // Clear password field on failure
    document.getElementById('signinPassword').value = '';
}
