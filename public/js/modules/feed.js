import Post from './post.js';

export default class Feed {
    constructor(container) {
        this.container = container;
        this.posts = [];
    }

    // Search for users
    async searchUsers(query) {
        if (!query.trim()) {
            this.showError('Search query cannot be empty.');
            return;
        }

        try {
            const response = await fetch(`/M00976018/users/search?q=${query}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                },
            });

            if (!response.ok) {
                throw new Error('No users found matching your query');
            }

            const users = await response.json();
            this.renderUserSearchResults(users);
        } catch (error) {
            // console.error('Error searching for users:', error);
            this.showError(error.message || 'Error searching for users. Please try again later.');
        }
    }

    // Search for posts
    async searchPosts(query) {
        if (!query.trim()) {
            this.showError('Search query cannot be empty.');
            return;
        }
    
        try {
            const response = await fetch(`/M00976018/contents/search?q=${query}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                },
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error searching for posts.');
            }
    
            const posts = await response.json();
    
            if (posts.length === 0) {
                this.showError('No posts found matching your query.');
                return;
            }
    
            this.renderPosts(posts); // Render the search results as posts
        } catch (error) {
            console.error('Error searching for posts:', error);
            this.showError(error.message || 'Error searching for posts. Please try again later.');
        }
    }
    

    // Fetch posts
    async fetchPosts(page = 1, limit = 10) {
        try {
            const response = await fetch(`/M00976018/contents?page=${page}&limit=${limit}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                },
            });
    
            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }
    
            const data = await response.json();
    
            // If data is an array (not wrapped in a 'posts' object)
            if (Array.isArray(data)) {
                this.posts = data; // Assign the array of posts directly
            } else {
                this.posts = []; // If the structure is unexpected, fallback to an empty array
            }
    
            if (this.posts.length === 0) {
                this.showError('No posts available.');
            }
    
            this.renderPosts();
        } catch (error) {
            console.error('Error fetching posts:', error);
            this.showError('Failed to fetch posts. Please try again later.');
        }
    }

    
    // Render the user search results
    renderUserSearchResults(users) {
        const searchResultsContainer = this.container.querySelector('#searchResults');
        searchResultsContainer.innerHTML = '';

        if (users.length === 0) {
            searchResultsContainer.innerHTML = '<p>No users found matching your query.</p>';
            return;
        }

        const loggedInUsername = localStorage.getItem('loggedInUser');

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-result';

            const isFollowing = user.isFollowing;
            const followButtonLabel = isFollowing ? 'Unfollow' : 'Follow';

            userElement.innerHTML = `
                <p><strong>${user.username}</strong> (${user.email})</p>
                <p><em>Bio:</em> ${user.profile.bio || 'No bio available'}</p>
                <p>Followers: ${user.profile.followers} | Following: ${user.profile.following}</p>
                <button class="follow-btn" data-username="${user.username}">${followButtonLabel}</button>
            `;

            const followButton = userElement.querySelector('.follow-btn');
            followButton.addEventListener('click', () => this.toggleFollowUser(user.username, followButton));

            searchResultsContainer.appendChild(userElement);
        });
    }

    async toggleFollowUser(username, button) {
        const isFollowing = button.textContent === 'Unfollow'; // Determine current state
        const endpoint = `/M00976018/follow/${username}`;
        const method = isFollowing ? 'DELETE' : 'POST'; // Choose action based on state
    
        try {
            const response = await fetch(endpoint, {
                method,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error updating follow status.');
            }
    
            // Update the button label and toggle state
            button.textContent = isFollowing ? 'Follow' : 'Unfollow';
        } catch (error) {
            console.error('Error updating follow status:', error);
            this.showError(error.message || 'Failed to update follow status. Please try again later.');
        }
    }
    


    // Render posts to the page
    renderPosts(postsToRender = this.posts) {
        if (!postsToRender || postsToRender.length === 0) {
            this.showError('No posts available to display.');
            return;
        }
    
        const postsContainer = document.createElement('div');
        postsContainer.className = 'posts-container';
    
        postsToRender.forEach(postData => {
            const post = new Post(postData, postsContainer); // Create a Post instance for each post
            postsContainer.appendChild(post.render()); // Render and append each post
        });
    
        const existingPostsContainer = this.container.querySelector('.posts-section');
        if (existingPostsContainer) {
            existingPostsContainer.innerHTML = ''; // Clear the container before appending new posts
            existingPostsContainer.appendChild(postsContainer); // Add the new posts
        } else {
            console.error('No posts-section container found.');
        }
    }
    

    // Show error messages
    showError(message) {
        const errorContainer = this.container.querySelector('.error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        }
    }

    // Escape HTML characters to prevent XSS attacks
    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Render the page
    render() {
        this.container.innerHTML = `
            <h1>Home</h1>
            
            <div class="error-message" style="color: red; display: none;"></div>
            
            <div class="search-section">
                <input type="text" id="searchQuery" placeholder="Search for users or posts..." />
                <button id="searchButton">Search</button>
                <div id="searchResults"></div>
            </div>
            
            <div class="posts-section"></div>
        `;

        const searchButton = this.container.querySelector('#searchButton');
        searchButton.addEventListener('click', () => {
            const searchQuery = this.container.querySelector('#searchQuery').value;
            this.searchUsers(searchQuery);
            this.searchPosts(searchQuery); // Search for posts too
        });

        this.fetchPosts();  // Initially fetch and display posts
    }
}
