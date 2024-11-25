import Post from './post.js';

export default class Homepage {
    constructor(container) {
        this.container = container;
        this.posts = [];
    }

    async fetchPosts() {
        try {
            // Fetch posts with credentials (session cookies, including the token)
            const response = await fetch('/M00976018/posts', {
                method: 'GET',
                credentials: 'include', // Include session cookies (important for token-based sessions)
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`, // Include token if available
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

    async addPost(event) {
        event.preventDefault();

        // Gather data from the form
        const title = event.target.title.value;
        const content = event.target.content.value;
        const mediaFiles = event.target.media.files;

        // Validate form data
        if (!title || !content) {
            this.showError('Title and content are required.');
            return;
        }

        // Retrieve the token for authorization
        const token = localStorage.getItem('token');
        if (!token) {
            this.showError('You must be logged in to post.');
            return;
        }

        // Prepare form data for media files
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        for (const file of mediaFiles) {
            formData.append('media', file);
        }

        // Send post data to the server
        try {
            const response = await fetch('/M00976018/posts', {
                method: 'POST',
                credentials: 'include', // Include session cookies (important for token-based sessions)
                headers: {
                    'Authorization': `Bearer ${token}`, // Add the Authorization token in header
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to add post:', errorData.message);
                this.showError(errorData.message || 'Failed to add post. Please try again.');
                return;
            }

            // Clear the form after successful submission
            event.target.reset();

            // Re-fetch posts to include the new post
            this.fetchPosts();
        } catch (error) {
            console.error('Error adding post:', error);
            this.showError('Error adding post. Please try again.');
        }
    }

    renderPosts(posts) {
        const postsContainer = document.createElement('div');
        postsContainer.className = 'posts-container';

        posts.forEach(postData => {
            const post = new Post(
                postData.author,
                postData.content,
                postData.media,
                new Date(postData.createdAt).toLocaleString()
            );
            const postElement = document.createElement('div');
            postElement.className = 'post';

            // Render post content (title, content, and media)
            postElement.innerHTML = `
                <h3>${postData.title}</h3>
                <p><strong>${postData.username}</strong></p>
                <p><strong>Content:</strong> ${postData.content}</p>
                <p><strong>Posted on:</strong> ${new Date(postData.createdAt).toLocaleString()}</p>
            `;

            // Handle rendering of media content (images, videos, and audio)
            const mediaContent = postData.media.map(file => {
                const fileUrl = `/M00976018/media/${file.filename}`;
                if (file.type.startsWith('image')) {
                    return `<img src="${fileUrl}" alt="Post media" class="post-media">`;
                } else if (file.type.startsWith('video')) {
                    return `<video controls class="post-media"><source src="${fileUrl}" type="${file.type}"></video>`;
                } else if (file.type.startsWith('audio')) {
                    return `<audio controls class="post-media"><source src="${fileUrl}" type="${file.type}"></audio>`;
                } else {
                    // Fallback for unsupported or missing MIME types
                    return `<p>Unsupported media type: ${file.type || 'unknown'}</p>`;
                }
            }).join('');

            if (mediaContent) {
                postElement.innerHTML += `<div class="media-content">${mediaContent}</div>`;
            }

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
        }
    }

    render() {
        this.container.innerHTML = `
            <h1>Home</h1>
            <form id="postForm">
                <input type="text" name="title" placeholder="Post Title" required>
                <textarea name="content" placeholder="Write your post..." required></textarea>
                <input type="file" name="media" multiple>
                <button type="submit">Post</button>
            </form>
            <div class="error-message" style="color: red; display: none;"></div>
            <div class="posts-section"></div>
        `;

        // Add an event listener to the form to handle submission
        const postForm = this.container.querySelector('#postForm');
        postForm.addEventListener('submit', (event) => this.addPost(event));

        // Fetch and display posts
        this.fetchPosts();
    }
}
