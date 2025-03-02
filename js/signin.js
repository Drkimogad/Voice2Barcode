document.getElementById('signinForm').addEventListener('submit', function(event) {
    event.preventDefault();

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
        window.location.href = 'dashboard.html'; // Redirect to the dashboard after successful login
    } else {
        alert('Incorrect password. Please try again.');
    }
});
