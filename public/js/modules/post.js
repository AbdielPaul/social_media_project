export default class Post {
    constructor(username, content, media = [], timestamp = new Date().toLocaleString()) {
        this.username = username;
        this.content = content;
        this.media = media; // Array of media objects with `filename` and `type`
        this.timestamp = timestamp;
    }

    render() {
        // Render media files based on their type
        let mediaContent = this.media.map(media => {
            if (!media || !media.type) return ''; // Ensure media and type are defined
            const fileType = media.type.split('/')[0]; // Extract type from MIME type
            const mediaUrl = `/M00976018/media/${media.filename}`; // Endpoint for fetching media

            if (fileType === 'image') {
                return `<img src="${mediaUrl}" class="img-fluid rounded mb-3" alt="Post Image">`;
            } else if (fileType === 'video') {
                return `
                    <video class="img-fluid rounded mb-3" controls>
                        <source src="${mediaUrl}" type="${media.type}">
                        Your browser does not support the video element.
                    </video>
                `;
            } else if (fileType === 'audio') {
                return `
                    <audio controls class="audio-player mb-3">
                        <source src="${mediaUrl}" type="${media.type}">
                        Your browser does not support the audio element.
                    </audio>
                `;
            } else {
                return ''; // Unsupported media type
            }
        }).join('');

        // Render the post card
        return `
            <div class="card mb-4">
                <div class="card-header">
                    <strong>${this.username}</strong>
                    <span class="text-muted ms-2">${this.timestamp}</span>
                </div>
                <div class="card-body">
                    <p>${this.content}</p>
                    ${mediaContent}
                </div>
                <div class="card-footer d-flex justify-content-between">
                    <button class="btn btn-outline-primary btn-sm">Like</button>
                    <button class="btn btn-outline-secondary btn-sm">Comment</button>
                </div>
            </div>
        `;
    }
}
