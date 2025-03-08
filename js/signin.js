// signin.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signinForm');
    const errorDisplay = document.getElementById('errorMessage');

    signinForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDisplay.textContent = '';
        
        const username = document.getElementById('signinUsername').value.trim();
        const password = document.getElementById('signinPassword').value;

        try {
            // 1. Client-Side Validation
            if (!username || !password) {
                throw new Error('Please fill in both fields');
            }

            // 2. Server Authentication (Replace with your actual API endpoint)
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Authentication failed');
            }

            // 3. Secure Session Initialization
            const { token } = await response.json();
            const salt = CryptoJS.lib.WordArray.random(128/8).toString();
            const key = SecurityHandler.generateKey(password, salt);

            // 4. Secure Storage
            sessionStorage.setItem('encryptionKey', key.toString());
            sessionStorage.setItem('encryptionSalt', salt);
            localStorage.setItem('authToken', token);

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
