document.getElementById('signupForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please fill in both fields');
        return;
    }

    // Check if the username already exists
    if (localStorage.getItem(username)) {
        alert('Username already exists. Please choose another.');
        return;
    }

    // Store username and password in localStorage (simple for testing, but should be hashed in production)
    localStorage.setItem(username, password);

    alert('Sign-up successful! You can now sign in.');
    window.location.href = 'signin.html'; // Redirect to the sign-in page after successful sign-up
});
