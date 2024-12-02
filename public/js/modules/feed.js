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
                throw new Error(errorData.message || 'Error searching for posts');
            }

            const posts = await response.json();
            this.renderPosts(posts); // Directly render the search results in the feed
        } catch (error) {
            console.error('Error searching for posts:', error);
            this.showError(error.message || 'Error searching for posts. Please try again later.');
        }
    }

    // Fetch posts
    async fetchPosts(page = 1, limit = 10) {
        try {
            const response = await fetch(`/M00976018/posts?page=${page}&limit=${limit}`, {
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

    // Toggle follow user
    async toggleFollowUser(username, followButton) {
        const isFollowing = followButton.textContent === 'Unfollow';
        const endpoint = isFollowing ? `/M00976018/follow/${username}` : `/M00976018/follow/${username}`;
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

            followButton.textContent = isFollowing ? 'Follow' : 'Unfollow';
        } catch (error) {
            console.error('Error toggling follow state:', error);
            alert('Error updating follow state');
        }
    }

    // Like a post
    async likePost(postId, likeButton) {
        try {
            const response = await fetch(`/M00976018/posts/${postId}/like`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                this.showError(errorData.message || 'Failed to like post. Please try again.');
                return;
            }

            const data = await response.json();
            likeButton.textContent = `Like (${data.likeCount})`;
        } catch (error) {
            console.error('Error liking post:', error);
            this.showError('Error liking post. Please try again.');
        }
    }

    // Add a comment to a post
    async addComment(postId, comment, commentsContainer, commentInput) {
        if (!comment.trim()) {
            this.showError('Comment cannot be empty.');
            return;
        }

        try {
            const response = await fetch(`/M00976018/posts/${postId}/comment`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comment }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                this.showError(errorData.message || 'Failed to add comment. Please try again.');
                return;
            }

            this.fetchPostComments(postId, commentsContainer);
            commentInput.value = '';
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Error adding comment. Please try again.');
        }
    }

    // Fetch comments for a post
    async fetchPostComments(postId, commentsContainer) {
        try {
            const response = await fetch(`/M00976018/posts/${postId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch post details');
            }

            const post = await response.json();
            const comments = post.comments || [];

            commentsContainer.innerHTML = '';
            comments.forEach(comment => {
                const commentElement = document.createElement('p');
                commentElement.textContent = `${comment.username}: ${comment.comment} (Posted on: ${new Date(comment.timestamp).toLocaleString()})`;
                commentsContainer.appendChild(commentElement);
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            this.showError('Failed to fetch comments. Please try again later.');
        }
    }

    // Render the user search results
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


    // Render posts to the page
    renderPosts(posts) {
        const postsContainer = document.createElement('div');
        postsContainer.className = 'posts-container';

        posts.forEach(postData => {
            const post = new Post(postData.username, postData.content, postData.media, new Date(postData.createdAt).toLocaleString());

            const postElement = document.createElement('div');
            postElement.className = 'post';

            postElement.innerHTML = `
                <h3>${postData.title}</h3>
                ${post.render()}
                <p><strong>Author:</strong> ${postData.username}</p>
                <button class="follow-btn" data-username="${postData.username}">${postData.isFollowing ? 'Unfollow' : 'Follow'}</button>
                <button class="like-btn" data-post-id="${postData._id}">Like (${postData.likeCount})</button>
                <form class="comment-form">
                    <input type="text" name="comment" placeholder="Write a comment..." required>
                    <button type="submit">Comment</button>
                </form>
            `;

            const likeButton = postElement.querySelector('.like-btn');
            likeButton.addEventListener('click', (event) => {
                const postId = event.target.dataset.postId;
                this.likePost(postId, likeButton);
            });

            const commentForm = postElement.querySelector('.comment-form');
            const commentInput = commentForm.querySelector('input[name="comment"]');
            commentForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const commentValue = commentInput.value;
                this.addComment(postData._id, commentValue, commentsContainer, commentInput);
            });

            const followButton = postElement.querySelector('.follow-btn');
            followButton.addEventListener('click', () => this.toggleFollowUser(postData.username, followButton));

            postsContainer.appendChild(postElement);
        });

        const existingPostsContainer = this.container.querySelector('.posts-section');
        existingPostsContainer.innerHTML = '';
        existingPostsContainer.appendChild(postsContainer);
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
