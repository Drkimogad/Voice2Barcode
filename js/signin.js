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
            // 1. Client-Side Validation
            if (!username || !password) {
                throw new Error('Please fill in both fields');
            }

            // 2. Hardcoded Credentials Check (Replace with your actual credentials)
            const validUsername = 'testuser';
            const validPassword = 'password123';

            if (username !== validUsername || password !== validPassword) {
                throw new Error('Invalid username or password');
            }

            // 3. Secure Session Initialization
            const salt = CryptoJS.lib.WordArray.random(128/8).toString();
            const key = CryptoJS.PBKDF2(password, salt, { keySize: 256/32 });

            // 4. Secure Storage
            sessionStorage.setItem('encryptionKey', key.toString());
            sessionStorage.setItem('encryptionSalt', salt);
            localStorage.setItem('authToken', 'dummy-token');

            // 5. Redirect with security headers
            window.location.href = 'dashboard.html';

        } catch (error) {
            errorDisplay.textContent = error.message;
            console.error('SignIn Error:', error);
            performSecurityCleanup();
        }
    });
});

function performSecurityCleanup() {
    // Clear sensitive data on failure
    sessionStorage.removeItem('encryptionKey');
    sessionStorage.removeItem('encryptionSalt');
    localStorage.removeItem('authToken');
    document.getElementById('signinPassword').value = '';
}
