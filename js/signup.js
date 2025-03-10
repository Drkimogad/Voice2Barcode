document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const errorDisplay = document.getElementById('errorMessage');

    signupForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        errorDisplay.textContent = '';

        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;

        try {
            // Basic validation
            if (!username || !password) throw new Error('All fields are required');

            // Save credentials in localStorage
            localStorage.setItem('username', username);
            localStorage.setItem('password', password);

            // Redirect to sign-in page
            window.location.href = 'signin.html';
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
