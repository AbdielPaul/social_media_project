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
            }
        } else {
            this.loadPage('login');
        }
    }

    updateNav(loggedInUser) {
        if (loggedInUser) {
            this.navLinks.login?.classList.add('hidden');
            this.navLinks.logout?.classList.remove('hidden');
            this.navLinks.homepage?.classList.remove('hidden');
            this.navLinks.feed?.classList.remove('hidden');
            this.navLinks.profile?.classList.remove('hidden');
        } else {
            this.navLinks.login?.classList.remove('hidden');
            this.navLinks.logout?.classList.add('hidden');
            this.navLinks.homepage?.classList.add('hidden');
            this.navLinks.feed?.classList.add('hidden');
            this.navLinks.profile?.classList.add('hidden');
        }
    }

    logout() {
        localStorage.removeItem('loggedInUser');
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

