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
            const response = await fetch('/M00976018/posts', {
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

            event.target.reset();
            await this.fetchPosts();
        } catch (error) {
            console.error('Error adding post:', error);
            this.showError('Error adding post. Please try again.');
        }
    }

    likePost(postId, likeButton) {
        console.log("Liking post:", postId);  // Log for debugging
    
        fetch(`http://localhost:8080/M00976018/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',  // Ensure session cookies are sent
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to like post');
            }
            return response.json();
        })
        .then(data => {
            console.log('Post liked successfully', data);
            const likeCount = data.likeCount;
            
            // Update the like count in the button
            likeButton.textContent = `Like (${likeCount})`;
        })
        .catch(error => {
            console.error('Error liking post:', error);
        });
    }
    
    
    
    

    // Function to fetch and render the post's comments
    fetchPostComments(postId, commentsContainer) {
        fetch(`http://localhost:8080/M00976018/posts/${postId}`)
            .then(response => response.json())
            .then(post => {
                const comments = post.comments || [];
                commentsContainer.innerHTML = '';  // Clear the current list of comments
                comments.forEach(comment => {
                    const commentElement = document.createElement('p');
                    // Format the comment with the username and timestamp
                    commentElement.textContent = `${comment.username}: ${comment.comment} (Posted on: ${new Date(comment.timestamp).toLocaleString()})`;
                    commentsContainer.appendChild(commentElement);  // Append comment to the container
                });
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
            });
    }

    // Add comment functionality
    addComment(postId, comment, commentsContainer) {
        if (!comment.trim()) {
            return;
        }

        fetch(`http://localhost:8080/M00976018/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment }), // Send the comment content
            credentials: 'same-origin',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add comment');
            }
            return response.json();
        })
        .then(data => {
            console.log('Comment added successfully', data);
            
            // After adding, update the comments section
            this.fetchPostComments(postId, commentsContainer);
        })
        .catch(error => {
            console.error('Error adding comment:', error);
        });
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
    
            // Ensure comments are always defined as an array
            const commentsContainer = document.createElement('div');
            commentsContainer.className = 'comments-container';
    
            // Handle the case where `postData.comments` may be undefined or null
            const comments = postData.comments || [];  // Default to empty array if undefined or null
    
            // Render existing comments
            comments.forEach(comment => {
                const commentElement = document.createElement('p');
                commentElement.textContent = `${comment.author}: ${comment.content}`;
                commentsContainer.appendChild(commentElement);
            });
    
            postElement.innerHTML = `
                <h3>${this.escapeHTML(postData.title)}</h3>
                ${post.render()}
                <p><strong>Author:</strong> ${this.escapeHTML(postData.username)}</p>
                <button class="like-btn" data-post-id="${postData._id}">Like (${Array.isArray(postData.likes) ? postData.likes.length : 0})</button>
                <form class="comment-form">
                    <input type="text" name="comment" placeholder="Write a comment...">
                    <button type="submit">Comment</button>
                </form>
            `;
    
            // Handle the like button
            const likeButton = postElement.querySelector('.like-btn');
            likeButton.addEventListener('click', (event) => {
                const postId = event.target.dataset.postId;
                this.likePost(postId, likeButton);  // Pass like button to update it directly
            });
    
            // Handle comment form submission
            const commentForm = postElement.querySelector('.comment-form');
            commentForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const commentInput = commentForm.querySelector('input[name="comment"]');
                this.addComment(postData._id, commentInput.value, commentsContainer);
                commentInput.value = ''; // Clear the input
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










