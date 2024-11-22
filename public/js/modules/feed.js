// modules/feed.js
export default class Feed {
    render(container) {
        container.innerHTML = `
            <div class="feed-container">
                <h2>Your Feed</h2>
                <p>Explore posts from around the world!</p>
            </div>
        `;
    }
}
