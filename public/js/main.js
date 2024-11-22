import Login from './modules/login.js';
import Homepage from './modules/homepage.js';
import Feed from './modules/feed.js';
import Profile from './modules/profile.js';

class App {
    constructor() {
        this.pages = {
            login: new Login(),
            homepage: new Homepage(document.getElementById('content')),
            feed: new Feed(),
            profile: new Profile(),
        };
    }

    loadPage(page) {
        const container = document.getElementById('content');
        const loggedInUser = localStorage.getItem('loggedInUser');
        
        if (loggedInUser || page === 'login') {
            this.pages[page].render(container);
            this.updateNav(loggedInUser);
        } else {
            this.loadPage('login');
        }
    }

    updateNav(loggedInUser) {
        document.getElementById('login-link').style.display = loggedInUser ? 'none' : 'inline';
        document.getElementById('logout-link').style.display = loggedInUser ? 'inline' : 'none';
    }

    logout() {
        localStorage.removeItem('loggedInUser');
        this.loadPage('login');
    }
}

// Initialize the app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    const loggedInUser = localStorage.getItem('loggedInUser');
    window.app.loadPage(loggedInUser ? 'homepage' : 'login');
});
