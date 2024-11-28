// Homepage.js

import Post from './post.js';

export default class Feed {
    constructor(container) {
        this.container = container;
        this.posts = [];
    }

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

    // async addPost(event) {
    //     event.preventDefault();

    //     const title = event.target.title.value.trim();
    //     const content = event.target.content.value.trim();
    //     const mediaFiles = event.target.media.files;

    //     if (!title || !content) {
    //         this.showError('Title and content are required.');
    //         return;
    //     }

    //     const token = localStorage.getItem('loggedInUser');
    //     if (!token) {
    //         this.showError('You must be logged in to post.');
    //         return;
    //     }

    //     const formData = new FormData();
    //     formData.append('title', title);
    //     formData.append('content', content);
    //     for (const file of mediaFiles) {
    //         formData.append('media', file);
    //     }

    //     try {
    //         const response = await fetch('/M00976018/posts', {
    //             method: 'POST',
    //             credentials: 'include',
    //             headers: {
    //                 'Authorization': `Bearer ${token}`,
    //             },
    //             body: formData,
    //         });

    //         if (!response.ok) {
    //             const errorData = await response.json();
    //             this.showError(errorData.message || 'Failed to add post. Please try again.');
    //             return;
    //         }

    //         event.target.reset();
    //         await this.fetchPosts();
    //     } catch (error) {
    //         console.error('Error adding post:', error);
    //         this.showError('Error adding post. Please try again.');
    //     }
    // }

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
            console.log('Post liked successfully', data);
            
            // Update the like count in the button
            likeButton.textContent = `Like (${data.likeCount})`;
        } catch (error) {
            console.error('Error liking post:', error);
            this.showError('Error liking post. Please try again.');
        }
    }

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

            console.log('Comment added successfully');
            
            // Fetch the latest comments for the post
            this.fetchPostComments(postId, commentsContainer);

            // Clear the comment input
            commentInput.value = '';
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Error adding comment. Please try again.');
        }
    }

    // Function to fetch and render the post's comments
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

            commentsContainer.innerHTML = ''; // Clear existing comments

            comments.forEach(comment => {
                const commentElement = document.createElement('p');
                commentElement.textContent = `${this.escapeHTML(comment.username)}: ${this.escapeHTML(comment.comment)} (Posted on: ${new Date(comment.timestamp).toLocaleString()})`;
                commentsContainer.appendChild(commentElement);
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            this.showError('Failed to fetch comments. Please try again later.');
        }
    }

    renderPosts(posts) {
        const postsContainer = document.createElement('div');
        postsContainer.className = 'posts-container';
    
        posts.forEach(postData => {
            const post = new Post(
                postData.username,
                postData.content,
                postData.media,
                new Date(postData.createdAt).toLocaleString()
            );
    
            const postElement = document.createElement('div');
            postElement.className = 'post';
    
            // Comments container
            const commentsContainer = document.createElement('div');
            commentsContainer.className = 'comments-container';
    
            // Render existing comments
            if (postData.comments && Array.isArray(postData.comments)) {
                postData.comments.forEach(comment => {
                    const commentElement = document.createElement('p');
                    commentElement.textContent = `${this.escapeHTML(comment.username)}: ${this.escapeHTML(comment.comment)} (Posted on: ${new Date(comment.timestamp).toLocaleString()})`;
                    commentsContainer.appendChild(commentElement);
                });
            }
    
            postElement.innerHTML = `
                <h3>${this.escapeHTML(postData.title)}</h3>
                ${post.render()}
                <p><strong>Author:</strong> ${this.escapeHTML(postData.username)}</p>
                <button class="like-btn" data-post-id="${postData._id}">Like (${postData.likeCount})</button>
                <form class="comment-form">
                    <input type="text" name="comment" placeholder="Write a comment..." required>
                    <button type="submit">Comment</button>
                </form>
            `;
    
            // Handle the like button
            const likeButton = postElement.querySelector('.like-btn');
            likeButton.addEventListener('click', (event) => {
                const postId = event.target.dataset.postId;
                this.likePost(postId, likeButton); // Pass like button to update it directly
            });
    
            // Handle comment form submission
            const commentForm = postElement.querySelector('.comment-form');
            const commentInput = commentForm.querySelector('input[name="comment"]');
            commentForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const commentValue = commentInput.value;
                this.addComment(postData._id, commentValue, commentsContainer, commentInput);
            });
    
            // Append the comments section and the post
            postElement.appendChild(commentsContainer);
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
        if (!str) return '';
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    render() {
        this.container.innerHTML = `
            <h1>Home</h1>
            
            <div class="error-message" style="color: red; display: none;"></div>
            <div class="posts-section"></div>
        `;

        // const postForm = this.container.querySelector('#postForm');
        // postForm.addEventListener('submit', (event) => this.addPost(event));

        this.fetchPosts();
    }
}
