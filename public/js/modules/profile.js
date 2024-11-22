// modules/profile.js
export default class Profile {
    render(container) {
        container.innerHTML = `
            <div class="profile-container">
                <h2>Your Profile</h2>
                <p>Manage your profile information here.</p>
            </div>
        `;
    }
}
