export default class Profile {
    async getProfile() {
        const token = localStorage.getItem('token'); // Assumes token is stored in localStorage

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

    async updateProfile(updatedProfileData) {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/M00976018/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedProfileData)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedProfile = await response.json();
            return updatedProfile;
        } catch (error) {
            console.error('Error updating profile:', error);
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
                        <p><strong>Playlists:</strong> ${profile.profile.playlists.join(', ')}</p>
                        <p><strong>Posts:</strong> ${profile.profile.posts.length}</p>
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
                        <div>
                            <label>Playlists (comma-separated): </label>
                            <input type="text" id="playlists" name="playlists" value="${profile.profile.playlists.join(', ')}" />
                        </div>
                        <button type="submit">Save</button>
                    </form>
                </div>
            `;

            const form = document.getElementById('profile-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedProfile = {
                    username: form.username.value,
                    email: form.email.value,
                    profile: {
                        ...profile.profile, // Preserve existing profile data
                        bio: form.bio.value,
                        favoriteGenres: form.favoriteGenres.value.split(',').map(genre => genre.trim()),
                        playlists: form.playlists.value.split(',').map(playlist => playlist.trim())
                    }
                };

                await this.updateProfile(updatedProfile);
                alert('Profile updated successfully');

                // Optionally re-render to show updated details
                await this.render(container);
            });
        } catch (error) {
            console.error('Error loading or updating profile:', error);
            container.innerHTML = '<p>Error loading profile</p>';
        }
    }
}
