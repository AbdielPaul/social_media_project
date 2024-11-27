import Post from './post.js';

export default class Feed {
    constructor(container) {
        this.container = container;
        this.posts = [];
    }

    async fetchPosts() {
        try {
            const response = await fetch('/M00976018/posts', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }

            const postsData = await response.json();
            this.renderPosts(postsData);
        } catch (error) {
            console.error('Error fetching posts:', error);
            this.showError('Failed to fetch posts. Please try again later.');
        }
    }

    async toggleFollowUser(username, followButton) {
        const isFollowing = followButton.textContent === 'Unfollow';
        const endpoint = `/M00976018/follow/${username}`;
        const method = isFollowing ? 'DELETE' : 'POST';
    
        try {
            const response = await fetch(endpoint, {
                method,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
            }
    
            // Toggle button text and persist state in localStorage
            followButton.textContent = isFollowing ? 'Follow' : 'Unfollow';
    
            // Save follow state locally for persistence
            const followState = JSON.parse(localStorage.getItem('followState')) || {};
            followState[username] = !isFollowing;
            localStorage.setItem('followState', JSON.stringify(followState));
        } catch (error) {
            console.error(`Error toggling follow status for ${username}:`, error);
            this.showError(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user. Please try again.`);
        }
    }

    renderPosts(posts) {
        const postsContainer = document.createElement('div');
        postsContainer.className = 'posts-container';
    
        const followState = JSON.parse(localStorage.getItem('followState')) || {};
    
        posts.forEach(postData => {
            const post = new Post(
                postData.username,
                postData.content,
                postData.media,
                new Date(postData.createdAt).toLocaleString()
            );
    
            const postElement = document.createElement('div');
            postElement.className = 'post';
    
            const isFollowing = followState[postData.username] ?? postData.isFollowing;
    
            postElement.innerHTML = `
                <h3>${this.escapeHTML(postData.title)}</h3>
                ${post.render()}
                <p><strong>Author:</strong> ${this.escapeHTML(postData.username)}</p>
                <button class="follow-btn" data-username="${postData.username}">
                    ${isFollowing ? 'Unfollow' : 'Follow'}
                </button>
            `;
    
            // Add event listener for the Follow/Unfollow button
            const followButton = postElement.querySelector('.follow-btn');
            followButton.addEventListener('click', () =>
                this.toggleFollowUser(postData.username, followButton)
            );
    
            postsContainer.appendChild(postElement);
        });
    
        const existingPostsContainer = this.container.querySelector('.posts-section');
        existingPostsContainer.innerHTML = ''; // Clear the container
        existingPostsContainer.appendChild(postsContainer);
    }

    showError(message) {
        const errorContainer = this.container.querySelector('.error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000); // Auto-hide after 5 seconds
        }
    }

    escapeHTML(str) {
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    render() {
        this.container.innerHTML = `
            <h1>Home</h1>
            <div class="error-message" style="color: red; display: none;"></div>
            <div class="posts-section"></div>
        `;

        this.fetchPosts();
    }
}
