export default class Profile {
    async getProfile() {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/M00976018/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }

            const profileData = await response.json();
            return profileData;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }

    async updateProfile(updatedProfile) {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/M00976018/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedProfile)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    async getPlaylistPosts(playlistName) {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`/M00976018/playlists/${playlistName}/posts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch playlist posts');
            }

            const { posts } = await response.json();
            return posts;
        } catch (error) {
            console.error('Error fetching playlist posts:', error);
            throw error;
        }
    }

    async createPlaylist(playlistName) {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/M00976018/playlists', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ playlistName })
            });

            if (!response.ok) {
                const { message } = await response.json();
                throw new Error(message);
            }

            const { newPlaylist } = await response.json();
            return newPlaylist;
        } catch (error) {
            console.error('Error creating playlist:', error);
            throw error;
        }
    }

    async deletePlaylist(playlistName) {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/M00976018/playlists', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ playlistName })
            });

            if (!response.ok) {
                const { message } = await response.json();
                throw new Error(message);
            }

            return 'Playlist deleted successfully';
        } catch (error) {
            console.error('Error deleting playlist:', error);
            throw error;
        }
    }

    async render(container) {
        try {
            const profile = await this.getProfile();
    
            container.innerHTML = `
                <div class="profile-container">
                    <h2>Your Profile</h2>
                    <div id="profile-details">
                        <p><strong>Username:</strong> ${profile.username}</p>
                        <p><strong>Email:</strong> ${profile.email}</p>
                        <p><strong>Bio:</strong> ${profile.profile.bio}</p>
                        <p><strong>Favorite Genres:</strong> ${profile.profile.favoriteGenres.join(', ')}</p>
                        <p><strong>Profile Picture:</strong> ${profile.profile.profilePicture || 'Not set'}</p>
                        <p><strong>Followers:</strong> ${profile.profile.followers.length}</p>
                        <p><strong>Following:</strong> ${profile.profile.following.length}</p>
                        <p><strong>Playlists:</strong> ${profile.profile.playlists.length}</p>
                        <p><strong>Posts:</strong> ${profile.profile.posts.length}</p>
                    </div>

                    <h3>Create New Playlist</h3>
                    <form id="create-playlist-form">
                        <div>
                            <label>Playlist Name: </label>
                            <input type="text" id="playlist-name" name="playlistName" />
                        </div>
                        <button type="submit">Create Playlist</button>
                    </form>
                    <div id="create-playlist-message"></div>
    
                    <h3>Your Playlists</h3>
                    <div id="saved-playlists-container">
                        ${await this.renderPlaylists(profile.profile.playlists)}
                    </div>
    
                    <h3>Edit Profile</h3>
                    <form id="profile-form">
                        <div>
                            <label>Username: </label>
                            <input type="text" id="username" name="username" value="${profile.username}" />
                        </div>
                        <div>
                            <label>Email: </label>
                            <input type="email" id="email" name="email" value="${profile.email}" />
                        </div>
                        <div>
                            <label>Bio: </label>
                            <textarea id="bio" name="bio">${profile.profile.bio}</textarea>
                        </div>
                        <div>
                            <label>Favorite Genres (comma-separated): </label>
                            <input type="text" id="favoriteGenres" name="favoriteGenres" value="${profile.profile.favoriteGenres.join(', ')}" />
                        </div>
                        <button type="submit">Save</button>
                    </form>
    
                    
                </div>
            `;
    
            // Handle profile editing
            const form = document.getElementById('profile-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
    
                const updatedProfile = {
                    username: form.username.value,
                    email: form.email.value,
                    profile: {
                        ...profile.profile,
                        bio: form.bio.value,
                        favoriteGenres: form.favoriteGenres.value.split(',').map(genre => genre.trim())
                    }
                };
    
                try {
                    await this.updateProfile(updatedProfile);
                    alert('Profile updated successfully');
                    await this.render(container); // Re-render profile with updated data
                } catch (error) {
                    alert(`Error updating profile: ${error.message}`);
                }
            });
    
            // Handle playlist creation
            const playlistForm = document.getElementById('create-playlist-form');
            playlistForm.addEventListener('submit', async (e) => {
                e.preventDefault();
    
                const playlistName = document.getElementById('playlist-name').value;
    
                try {
                    const newPlaylist = await this.createPlaylist(playlistName);
                    const messageDiv = document.getElementById('create-playlist-message');
                    messageDiv.innerHTML = `<p>Playlist "${newPlaylist.name}" created successfully!</p>`;
    
                    const updatedProfile = await this.getProfile();
                    document.getElementById('saved-playlists-container').innerHTML = await this.renderPlaylists(updatedProfile.profile.playlists);
    
                    // Reattach delete event listeners after re-rendering
                    this.attachDeletePlaylistListeners();
                } catch (error) {
                    const messageDiv = document.getElementById('create-playlist-message');
                    messageDiv.innerHTML = `<p style="color: red;">${error.message}</p>`;
                }
            });
    
            // Attach delete event listeners initially
            this.attachDeletePlaylistListeners();
        } catch (error) {
            console.error('Error loading or updating profile:', error);
            container.innerHTML = '<p>Error loading profile</p>';
        }
    }

    async renderPlaylists(playlists) {
        if (playlists.length === 0) {
            return `<p>You have no playlists yet.</p>`;
        }
    
        return playlists.map(playlist => `
            <div class="playlist" data-playlist-name="${playlist.name}">
                <h4>${playlist.name}</h4>
                <p>${playlist.posts.length} posts</p>
                <button class="delete-playlist-button" data-playlist-name="${playlist.name}">Delete</button>
            </div>
        `).join('');
    }

    attachDeletePlaylistListeners() {
        const deleteButtons = document.querySelectorAll('.delete-playlist-button');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const playlistName = button.dataset.playlistName;
    
                try {
                    await this.deletePlaylist(playlistName);
                    alert(`Playlist "${playlistName}" deleted successfully`);
    
                    const updatedProfile = await this.getProfile();
                    document.getElementById('saved-playlists-container').innerHTML = await this.renderPlaylists(updatedProfile.profile.playlists);
    
                    // Reattach delete event listeners after re-rendering
                    this.attachDeletePlaylistListeners();
                } catch (error) {
                    alert(`Error deleting playlist: ${error.message}`);
                }
            });
        });
    }
}
