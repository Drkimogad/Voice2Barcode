document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signinForm');
    const errorDisplay = document.getElementById('errorMessage');

    signinForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDisplay.textContent = '';

        const username = document.getElementById('signinUsername').value.trim();
        const password = document.getElementById('signinPassword').value;

        try {
            // Basic validation
            if (!username || !password) throw new Error('All fields are required');

            // Simulate API call (replace with real backend integration)
            const response = await simulateLoginAPI(username, password);

            if (!response.success) throw new Error(response.message);

            // Save token and redirect
            localStorage.setItem('authToken', response.token);
            console.log('Token saved:', localStorage.getItem('authToken')); // Debugging
            window.location.href = 'dashboard.html'; // Use href instead of replace
        } catch (error) {
            errorDisplay.textContent = error.message;
            performSecurityCleanup();
        }
    });
});

// Simulate API call (replace with actual backend integration)
async function simulateLoginAPI(username, password) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Replace this with your backend logic
            if (username === 'testuser' && password === 'password123') {
                resolve({ success: true, token: 'dummy-token', message: 'Login successful' });
            } else {
                resolve({ success: false, message: 'Invalid username or password' });
            }
        }, 500); // Simulate network delay
    });
}

// Clear sensitive data on failure
function performSecurityCleanup() {
    document.getElementById('signinPassword').value = '';
}
