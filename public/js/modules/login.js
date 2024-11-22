export default class Login {
    render(container) {
        container.innerHTML = `
            <div class="login-container">
                <h2>Login or Sign Up</h2>
                <form id="signup-form">
                    <h3>Sign Up</h3>
                    <div class="mb-3">
                        <input type="text" id="signup-username" class="form-control" placeholder="Username" required>
                    </div>
                    <div class="mb-3">
                        <input type="email" id="signup-email" class="form-control" placeholder="Email" required>
                    </div>
                    <div class="mb-3">
                        <input type="password" id="signup-password" class="form-control" placeholder="Password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Sign Up</button>
                </form>
                <hr>
                <form id="login-form">
                    <h3>Login</h3>
                    <div class="mb-3">
                        <input type="text" id="login-username" class="form-control" placeholder="Username" required>
                    </div>
                    <div class="mb-3">
                        <input type="password" id="login-password" class="form-control" placeholder="Password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Login</button>
                </form>
            </div>
        `;

        // Handle Sign Up form submission
        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            try {
                const response = await fetch('/M00976018/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }),
                });

                const result = await response.json();
                if (response.ok) {
                    alert(result.message); // Success message
                    document.getElementById('signup-form').reset(); // Clear signup form
                } else {
                    alert(result.message); // Display server error message
                }
            } catch (error) {
                console.error('Signup error:', error);
                alert('An error occurred during signup. Please try again.');
            }
        });

        // Handle Login form submission
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('/M00976018/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                if (!response.ok) {
                    const errorResult = await response.json();
                    alert(errorResult.message || 'An error occurred during login. Please try again.');
                    return;
                }

                const result = await response.json();

                // Save the JWT token in localStorage
                if (result.token) {
                    localStorage.setItem('token', result.token);
                }

                // Fetch user profile using the token
                const profileResponse = await fetch('/M00976018/api/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${result.token}`, // Include token in the Authorization header
                    },
                });

                // Check profile response
                if (!profileResponse.ok) {
                    const profileError = await profileResponse.json();
                    alert(profileError.message || 'Error fetching profile.');
                    return;
                }

                const profile = await profileResponse.json();
                localStorage.setItem('userProfile', JSON.stringify(profile)); // Store user profile

                localStorage.setItem('loggedInUser', username); // Store the logged-in user's username
                alert('Login successful');

                // Redirect to homepage
                if (window.app && typeof window.app.loadPage === 'function') {
                    window.app.loadPage('homepage');
                } else {
                    console.warn("Homepage redirection function not found.");
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }
}
