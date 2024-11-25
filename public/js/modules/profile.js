// modules/profile.js

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

    async updateProfile(profileData) {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/M00976018/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
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
                        <p><strong>favoriteGenres:</strong> ${profile.profile.favoriteGenres}</p>
                        <p><strong>profilePicture:</strong> ${profile.profile.profilePicture}</p>
                        <p><strong>followers:</strong> ${profile.profile.followers}</p>
                        <p><strong>following:</strong> ${profile.profile.following}</p>
                        <p><strong>playlists:</strong> ${profile.profile.playlists}</p>
                        <p><strong>posts:</strong> ${profile.profile.posts}</p>

                        
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
                            <label>favoriteGenres: </label>
                            <input type="text" id="favoriteGenres" name="favoriteGenres" value="${profile.profile.favoriteGenres}" />
                        </div>
                        
                        <div>
                            <label>playlists: </label>
                            <input type="text" id="playlists" name="playlists" value="${profile.playlists}" />
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
                        bio: form.bio.value,
                        favoriteGenres: form.favoriteGenres.value,
                        playlists: form.playlists.value,
                    }
                };

                await this.updateProfile(updatedProfile);
                alert('Profile updated successfully');
                
                // Optionally re-render to show updated details
                await this.render(container);
            });
        } catch (error) {
            container.innerHTML = '<p>Error loading profile</p>';
        }
    }
}
