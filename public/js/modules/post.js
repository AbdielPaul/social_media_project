export default class Post {
    constructor(postData, parentContainer) {
        this.username = postData.username;
        this.content = postData.content;
        this.media = postData.media || [];
        this.title = postData.title || '';
        this.comments = postData.comments || [];
        this.likedBy = postData.likedBy || 0;
        this.postId = postData._id;
        this.isFollowing = postData.isFollowing || false;
        this.createdAt = new Date(postData.createdAt).toLocaleString();
        this.parentContainer = parentContainer;
    }

    render() {
        // Render media content
        const mediaContent = this.media
            .map(media => {
                if (!media || !media.type) return ''; // Ensure media and type are defined
                const fileType = media.type.split('/')[0]; // Extract type from MIME type
                const mediaUrl = `/M00976018/media/${media.filename}`; // Endpoint for fetching media
    
                if (fileType === 'image') {
                    return `
                        <div class="fixed-ratio-container">
                            <img src="${mediaUrl}" class="fixed-ratio-content img-fluid rounded mb-3" alt="Post Image">
                        </div>`;
                } else if (fileType === 'video') {
                    return `
                        <div class="fixed-ratio-container">
                            <video class="fixed-ratio-content img-fluid rounded mb-3" controls>
                                <source src="${mediaUrl}" type="${media.type}">
                                Your browser does not support the video element.
                            </video>
                        </div>`;
                } else if (fileType === 'audio') {
                    return `
                        <div class="audio-container">
                            <audio controls class="audio-player mb-3">
                                <source src="${mediaUrl}" type="${media.type}">
                                Your browser does not support the audio element.
                            </audio>
                        </div>`;
                } else {
                    return ''; // Unsupported media type
                }
            })
            .join('');
    
        // Create post HTML structure
        const postElement = document.createElement('div');
        postElement.className = 'card mb-4 post';
        const isLiked = this.likedBy.includes(localStorage.getItem('loggedInUser'));
        const likeButtonIconClass = isLiked ? 'bi-heart-fill' : 'bi-heart';
        const likeButtonText = this.likedBy.length || 0;
        postElement.innerHTML = `
            <div class="card-header">
                <strong>${this.escapeHTML(this.username)}</strong>
                <span class="text-muted ms-2">${this.createdAt}</span>
                <button class="follow-btn" data-post-id="${this.postId}">
                    ${this.isFollowing ? 'Unfollow' : 'Follow'}
                </button>
            </div>
            <div class="card-body">
                <h3>${this.escapeHTML(this.title)}</h3>
                <p>${this.escapeHTML(this.content)}</p>
                ${mediaContent}
                <button class="like-btn"><i class="bi ${likeButtonIconClass}"></i> ${likeButtonText}</button>
                <button class="save-btn"><i class="bi bi-bookmark"></i></button>
                <form class="comment-form">
                    <input type="text" name="comment" placeholder="Write a comment..." required>
                    <button type="submit">Comment</button>
                </form>
                <div class="comments-container">
                    ${this.comments
                        .map(comment => `
                            <p>
                                <strong>${this.escapeHTML(comment.username)}</strong>: ${this.escapeHTML(comment.comment)}
                            </p>`)
                        .join('')}
                </div>
            </div>
        `;
    
        // Add event listeners for buttons and forms
        postElement.querySelector('.like-btn').addEventListener('click', () => this.likePost());
        postElement.querySelector('.follow-btn').addEventListener('click', () => this.toggleFollow());
        postElement.querySelector('.save-btn').addEventListener('click', () => this.saveToPlaylist());
        postElement.querySelector('.comment-form').addEventListener('submit', event => {
            event.preventDefault();
            const commentInput = event.target.comment;
            this.addComment(commentInput.value, postElement.querySelector('.comments-container'));
            commentInput.value = '';
        });
    
        return postElement;
    }
    
    

    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    async likePost() {
        try {
            const response = await fetch(`/M00976018/posts/${this.postId}/like`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to like/unlike post');
            }

            const data = await response.json();

            // Update the like button dynamically
            const likeButton = this.parentContainer.querySelector('.like-btn');
            if (likeButton) {
                const isLiked = data.likedBy.includes(localStorage.getItem('loggedInUser'));
                const likeButtonIconClass = isLiked ? 'bi-heart-fill' : 'bi-heart';
                const likeCount = data.likedBy.length;

                // Update like button text with like count and the correct icon
                likeButton.innerHTML = `<i class="bi ${likeButtonIconClass}"></i> ${likeCount}`;
            } else {
                console.error('Like button not found in DOM!');
            }
        } catch (error) {
            console.error('Error liking/unliking post:', error);
            alert(error.message);
        }
    }
    
    async toggleFollow() {
        const isFollowing = this.isFollowing;
        const method = isFollowing ? 'DELETE' : 'POST';
    
        try {
            const response = await fetch(`/M00976018/follow/${this.username}`, {
                method,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                },
            });
    
            if (!response.ok) {
                throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
            }
    
            this.isFollowing = !isFollowing;
    
            // Update the button text dynamically
            const followButton = this.parentContainer.querySelector(`.follow-btn[data-post-id="${this.postId}"]`);
            if (followButton) {
                followButton.textContent = this.isFollowing ? 'Unfollow' : 'Follow';
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    }
    

    async saveToPlaylist() {
        const playlistName = prompt('Enter the playlist name to save this post to:');
        if (!playlistName) return;

        try {
            const response = await fetch(`/M00976018/playlists/${encodeURIComponent(playlistName)}/savePost`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loggedInUser')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ postId: this.postId }),
            });

            if (!response.ok) {
                throw new Error('Failed to save post to playlist');
            }

            alert('Post saved successfully to the playlist.');
        } catch (error) {
            console.error('Error saving to playlist:', error);
        }
    }

    async addComment(comment, commentsContainer) {
        try {
            const response = await fetch(`/M00976018/posts/${this.postId}/comment`, {
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
                throw new Error(errorData.message || 'Failed to add comment');
            }
    
            const data = await response.json();
            console.log('Response data:', data); // Debugging line
            
            const loggedInUsername = localStorage.getItem('loggedInUser');
            // Check if response contains the username and comment
            const username = data.username || loggedInUsername || 'You'; // Use "You" as a fallback if username isn't returned
            const commentText = data.comment || comment;
    
            // Dynamically render the new comment
            const newComment = document.createElement('p');
            newComment.innerHTML = `
                <strong>${this.escapeHTML(username)}</strong>: ${this.escapeHTML(commentText)}
            `;
            commentsContainer.appendChild(newComment);
        } catch (error) {
            console.error('Error adding comment:', error);
            alert(error.message || 'Error adding comment. Please try again.');
        }
    }
}
