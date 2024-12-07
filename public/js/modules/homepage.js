import Post from './post.js';

export default class Homepage {
    constructor(container) {
        if (!(container instanceof HTMLElement)) {
            throw new Error('Invalid container provided to Homepage.');
        }
        this.container = container;
        this.posts = [];
    }

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

            // Filter posts by whether the logged-in user follows the author
            this.posts = data.filter(post => post.isFollowing); // Only include posts from followed users

            if (this.posts.length === 0) {
                this.showError('No posts available from followed users.');
            }

            this.renderPosts();
        } catch (error) {
            console.error('Error fetching posts:', error);
            this.showError('Failed to fetch posts. Please try again later.');
        }
    }

    renderPosts() {
        console.log('Filtered Posts:', this.posts); // Debugging line to ensure posts are filtered

        if (!this.posts || this.posts.length === 0) {
            this.showError('No posts available to display.');
            return;
        }

        const postsContainer = document.createElement('div');
        postsContainer.className = 'posts-container';

        this.posts.forEach(postData => {
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

    showError(message) {
        const errorContainer = this.container.querySelector('.error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000); // Auto-hide the error message after 5 seconds
        }
    }

    render() {
        this.container.innerHTML = `
            <h1>Home</h1>
            <form id="postForm">
                <input type="text" id="create-post-title" name="title" placeholder="Post Title" required>
                <textarea name="content" id="" placeholder="Write your post..." required></textarea>
                <input type="file" id="" name="media" multiple>
                <button type="submit">Post</button>
            </form>
            <div class="error-message" style="color: red; display: none;"></div>
            <div class="posts-section"></div>
        `;

        const postForm = this.container.querySelector('#postForm');
        postForm.addEventListener('submit', (event) => this.addPost(event));

        this.fetchPosts(); // Fetch posts from the API (filter by followed users)
    }

    async addPost(event) {
        event.preventDefault();

        const title = event.target.title.value.trim();
        const content = event.target.content.value.trim();
        const mediaFiles = event.target.media.files;

        if (!title || !content) {
            this.showError('Title and content are required.');
            return;
        }

        const token = localStorage.getItem('loggedInUser');
        if (!token) {
            this.showError('You must be logged in to post.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        for (const file of mediaFiles) {
            formData.append('media', file);
        }

        try {
            const response = await fetch('/M00976018/contents', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                this.showError(errorData.message || 'Failed to add post. Please try again.');
                return;
            }

            event.target.reset(); // Clear form after successful post
            await this.fetchPosts(); // Refresh posts after adding
        } catch (error) {
            console.error('Error adding post:', error);
            this.showError('Error adding post. Please try again.');
        }
    }
}
