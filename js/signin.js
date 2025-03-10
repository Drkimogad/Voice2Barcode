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

            // Hardcoded credentials (replace with your logic if needed)
            const validUsername = 'testuser';
            const validPassword = 'password123';

            if (username !== validUsername || password !== validPassword) {
                throw new Error('Invalid username or password');
            }

            // Save token in localStorage
            localStorage.setItem('authToken', 'dummy-token');
            console.log('Token saved:', localStorage.getItem('authToken')); // Debugging

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
