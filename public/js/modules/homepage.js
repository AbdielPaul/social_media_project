import Post from './post.js';

export default class Homepage {
    constructor(container) {
        this.container = container;
        this.posts = [];
    }

    async fetchPosts() {
        try {
            const response = await fetch('/M00976018/api/posts'); // Adjust the URL to your API endpoint
            const postsData = await response.json();
            console.log(postsData); // Log the fetched posts data
            this.renderPosts(postsData);
        } catch (error) {
            console.error('Error fetching posts:', error);
            this.showError('Failed to fetch posts. Please try again later.');
        }
    }

    async addPost(event) {
        event.preventDefault();

        // Gather data from the form
        const author = event.target.author.value;
        const title = event.target.title.value;
        const content = event.target.content.value;
        const mediaFiles = event.target.media.files;

        // Validate form data
        if (!author || !title || !content) {
            this.showError('All fields are required.');
            return;
        }

        // Prepare form data for media files
        const formData = new FormData();
        formData.append('author', author);
        formData.append('title', title);
        formData.append('content', content);
        for (const file of mediaFiles) {
            formData.append('media', file); // Assuming the server handles multiple files
        }

        // Send post data to the server
        try {
            const response = await fetch('/M00976018/api/posts', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Clear the form after successful submission
                event.target.reset();
                // Re-fetch posts to include the new post
                this.fetchPosts();
            } else {
                console.error('Failed to add post');
                this.showError('Failed to add post. Please try again.');
            }
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
                <p><strong>Author:</strong> ${postData.author}</p>
                <p><strong>Content:</strong> ${postData.content}</p>
                <p><strong>Posted on:</strong> ${new Date(postData.createdAt).toLocaleString()}</p>
            `;

            // Handle rendering of media content (images, videos, and audio)
            const mediaContent = postData.media.map(file => {
                const fileUrl = `/M00976018/api/media/${file.filename}`;
                if (file.type.startsWith('image')) {
                    return `<img src="${fileUrl}" alt="Post media" class="post-media">`;
                } else if (file.type.startsWith('video')) {
                    return `<video controls class="post-media"><source src="${fileUrl}" type="${file.type}"></video>`;
                } else if (file.type.startsWith('audio')) {
                    return `<audio controls class="post-media"><source src="${fileUrl}" type="${file.type}"></audio>`;
                }
                return ''; // In case the file type doesn't match any of the supported types
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
            <h1>Homepage</h1>
            <form id="postForm">
                <input type="text" name="author" placeholder="Your Name" required>
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
