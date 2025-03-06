document.getElementById('signinForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await handleSignIn();
});

async function handleSignIn() {
    const username = document.getElementById('signinUsername').value;
    const password = document.getElementById('signinPassword').value;

    if (!username || !password) {
        alert('Please fill in both fields');
        return;
    }

    // Retrieve stored password from localStorage
    const storedPassword = localStorage.getItem(username);

    if (!storedPassword) {
        alert('Username does not exist.');
        return;
    }

    // Check if the password matches
    if (storedPassword === password) {
        alert('Login successful!');
        localStorage.setItem('loggedInUser', username);  // Store the logged-in user
        console.log('User logged in:', username);  // Log the logged-in user
        window.location.href = 'dashboard.html';  // Redirect to dashboard
    } else {
        alert('Incorrect password. Please try again.');
    }
}
