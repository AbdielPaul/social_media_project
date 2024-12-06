import Login from './modules/login.js';
import Homepage from './modules/homepage.js';
import Feed from './modules/feed.js';
import Profile from './modules/profile.js';

class App {
    constructor() {
        this.container = document.getElementById('content');
        this.pages = {
            login: new Login(),
            homepage: new Homepage(this.container),
            feed: new Feed(this.container),
            profile: new Profile(this.container),
        };
        this.navLinks = {
            login: document.getElementById('login-link'),
            homepage: document.getElementById('homepage-link'),
            feed: document.getElementById('feed-link'),
            profile: document.getElementById('profile-link'),
            logout: document.getElementById('logout-link'),
        };

        this.setupEventListeners();
        this.updateNav(localStorage.getItem('loggedInUser'));
    }

    setupEventListeners() {
        // Navigation link handlers
        this.navLinks.login?.addEventListener('click', () => this.loadPage('login'));
        this.navLinks.homepage?.addEventListener('click', () => this.loadPage('homepage'));
        this.navLinks.feed?.addEventListener('click', () => this.loadPage('feed'));
        this.navLinks.profile?.addEventListener('click', () => this.loadPage('profile'));
        this.navLinks.logout?.addEventListener('click', () => this.logout());
    }

    loadPage(page) {
        const loggedInUser = localStorage.getItem('loggedInUser');
    
        if (loggedInUser || page === 'login') {
            if (this.pages[page]) {
                this.pages[page].render(this.container);
                this.updateNav(loggedInUser);
            } else {
                console.error(`Page "${page}" not found.`);
                this.container.innerHTML = `<p>Page not found. Please try again.</p>`;
            }
        } else {
            this.loadPage('login');
        }
    }
    

    updateNav(loggedInUser) {
        if (loggedInUser) {
            this.navLinks.login?.classList.add('hidden');
            this.navLinks.logout?.classList.remove('hidden');
        } else {
            this.navLinks.login?.classList.remove('hidden');
            this.navLinks.logout?.classList.add('hidden');
        }
    }

    async logout() {
        try {
            // logout request to the server
            const response = await fetch('http://localhost:8080/M00976018/login', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (response.ok) {
                console.log('Successfully logged out on the server.');
            } else {
                console.warn('Server-side logout failed:', await response.json());
            }
        } catch (error) {
            console.error('Error during server-side logout:', error);
        }
    
        // Removing local session and redirecting to login page
        localStorage.removeItem('loggedInUser');
        this.updateNav(null);
        this.loadPage('login');
    }
    
}

// Initialize the app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app; // Ensure global accessibility
    const loggedInUser = localStorage.getItem('loggedInUser');
    app.loadPage(loggedInUser ? 'homepage' : 'login');
});

