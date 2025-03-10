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
            if (!username || !password) throw new Error('All fields required');

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Replace with real authentication logic
            if (username !== 'testuser' || password !== 'password123') {
                throw new Error('Invalid credentials');
            }

            // Set auth token 
            localStorage.setItem('authToken', 'dummy-token');
            
            // Force token write before redirect
            window.localStorage && (window.location.href = 'dashboard.html');
        } catch (error) {
            errorDisplay.textContent = error.message;
            performSecurityCleanup();
        }
    });
});

function performSecurityCleanup() {
    document.getElementById('signinPassword').value = '';
}
