// server.js

const express = require('express');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session'); // Required for session management
const dotenv = require('dotenv'); // For environment variables

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 8080;

// MongoDB connection
const uri = process.env.MONGODB_URI || "mongodb+srv://abdielpaul:Abdiel%4024813@cluster0.ebpls.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db, usersCollection, postsCollection, gfs;

async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db('M00976018');
        usersCollection = db.collection('users');
        postsCollection = db.collection('posts');
        gfs = new GridFSBucket(db, { bucketName: 'uploads' });
        console.log('Connected to MongoDB and initialized collections');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

connectToDatabase();

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use('/M00976018', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration 
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use environment variable for secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
        httpOnly: true, // Prevent JavaScript access to cookies
        maxAge: 1000 * 60 * 60 // 1-hour session expiration
    }
}));

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// User signup endpoint
const hashPassword = (password) => bcrypt.hashSync(password, 10);

// Middleware to protect routes
const ensureLoggedIn = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized access, please log in' });
    }
    next();
};

// Fetch the feed: posts from users the current user follows
app.get('/M00976018/feed', ensureLoggedIn, async (req, res) => {
    const username = req.session.username;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        // Fetch the current user's profile to get the list of followed users
        const user = await usersCollection.findOne({ username });

        if (!user || !user.profile.following || user.profile.following.length === 0) {
            return res.status(404).json({ message: 'No followed users or feed content available' });
        }

        // Fetch posts from followed users
        const posts = await postsCollection
            .aggregate([
                {
                    $match: { username: { $in: user.profile.following } } // Match posts by followed users
                },
                {
                    $sort: { createdAt: -1 } // Sort posts by most recent
                },
                {
                    $skip: (page - 1) * limit // Apply pagination
                },
                {
                    $limit: limit
                },
                {
                    $addFields: {
                        likeCount: { $ifNull: ["$likeCount", 0] },
                        comments: { $ifNull: ["$comments", []] },
                        commentCount: { $size: { $ifNull: ["$comments", []] } }
                    }
                },
                {
                    $project: {
                        title: 1,
                        content: 1,
                        username: 1,
                        media: 1,
                        createdAt: 1,
                        likeCount: 1,
                        comments: 1,
                        commentCount: 1
                    }
                }
            ])
            .toArray();

        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).json({ message: 'Error fetching feed' });
    }
});


app.post('/M00976018/users', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = {
            username,
            email,
            password: hashPassword(password),
            profile: {
                bio: '',
                favoriteGenres: [],
                profilePicture: null,
                followers: [],
                following: [],
                playlists: [],
                posts: []
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Error during signup' });
    }
});

// User login endpoint
app.post('/M00976018/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await usersCollection.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        // Store user session data
        req.session.userId = user._id;
        req.session.username = user.username;

        res.status(200).json({ message: 'Login successful', username: user.username });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});



// Logout endpoint
app.post('/M00976018/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ message: 'Error during logout' });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.status(200).json({ message: 'Logout successful' });
    });
});

// Check login status (GET /status)
app.get('/M00976018/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.status(200).json({ message: 'User is logged in', username: req.session.username });
    }
    res.status(200).json({ message: 'User is not logged in' });
});

// User profile endpoint
app.get('/M00976018/profile', ensureLoggedIn, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ _id: new ObjectId(req.session.userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Exclude the password from the profile response
        const { password, ...userProfile } = user;
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Update user profile endpoint
app.put('/M00976018/profile', ensureLoggedIn, async (req, res) => {
    try {
        const updatedData = req.body;
        const userId = req.session.userId;

        // Update user profile
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    username: updatedData.username, 
                    email: updatedData.email, 
                    profile: updatedData.profile, 
                    updatedAt: new Date() 
                } 
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'User not found or no changes made' });
        }

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const { password, ...userProfile } = updatedUser;
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Create a new post
app.post('/M00976018/posts', ensureLoggedIn, upload.array('media', 5), async (req, res) => {
    try {
        const { title, content } = req.body;
        const username = req.session.username; // Get username from the authenticated user

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        let media = [];
        if (req.files) {
            for (const file of req.files) {
                // Upload file to GridFS
                const uploadStream = gfs.openUploadStream(file.originalname, {
                    contentType: file.mimetype,
                });

                uploadStream.end(file.buffer);

                uploadStream.on('finish', async () => {
                    media.push({
                        filename: uploadStream.id.toString(),
                        type: file.mimetype,
                    });

                    // Save the post to MongoDB
                    const newPost = { title, content, username, media, createdAt: new Date() };
                    await postsCollection.insertOne(newPost);

                    res.status(201).json({ message: 'Post created successfully', post: newPost });
                });
            }
        } else {
            // Save the post without media
            const newPost = { title, content, username, createdAt: new Date() };
            await postsCollection.insertOne(newPost);
            res.status(201).json({ message: 'Post created successfully', post: newPost });
        }
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Error creating post' });
    }
});

// Fetch all posts with likes and comments
app.get('/M00976018/posts', ensureLoggedIn, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        // Fetch posts with pagination and additional fields for like count and comments
        const posts = await postsCollection
            .aggregate([
                {
                    $sort: { createdAt: -1 } // Sort by most recent
                },
                {
                    $skip: (page - 1) * limit // Pagination
                },
                {
                    $limit: limit
                },
                {
                    $addFields: {
                        likeCount: { $ifNull: ["$likeCount", 0] }, // Default to 0 if likeCount is not present
                        comments: { $ifNull: ["$comments", []] }, // Default to empty array
                        commentCount: { $size: { $ifNull: ["$comments", []] } } // Count of comments
                    }
                },
                {
                    $project: {
                        title: 1,
                        content: 1,
                        username: 1,
                        media: 1,
                        createdAt: 1,
                        likeCount: 1,
                        comments: 1,
                        commentCount: 1
                    }
                }
            ])
            .toArray();

        // Check if the logged-in user is following the author of each post
        const currentUsername = req.session.username; // Get the logged-in user's username
        const updatedPosts = await Promise.all(
            posts.map(async post => {
                const author = await usersCollection.findOne({ username: post.username });
                const isFollowing = author?.profile.followers.includes(currentUsername) || false;

                return { ...post, isFollowing };
            })
        );

        res.status(200).json(updatedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Error fetching posts' });
    }
});


// Get a specific post with comments
app.get('/M00976018/posts/:postId', ensureLoggedIn, async (req, res) => {
    const { postId } = req.params;

    try {
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Ensure likeCount and comments are present
        post.likeCount = post.likeCount || 0;
        post.comments = post.comments || [];

        res.status(200).json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Error fetching post' });
    }
});

// Like a post
app.post('/M00976018/posts/:postId/like', ensureLoggedIn, async (req, res) => {
    const { postId } = req.params;
    const username = req.session.username;

    try {
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Optionally, prevent multiple likes from the same user
        // For simplicity, we'll allow multiple likes here

        // Increment the like count in the post document
        const updatedPost = await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $inc: { likeCount: 1 } } // Increment likeCount by 1
        );

        if (updatedPost.modifiedCount === 0) {
            return res.status(500).json({ message: 'Error liking post' });
        }

        // Fetch the updated likeCount
        const updated = await postsCollection.findOne({ _id: new ObjectId(postId) });

        res.status(200).json({ message: 'Post liked successfully', likeCount: updated.likeCount });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ message: 'Error liking post' });
    }
});

// Add a comment to a post
app.post('/M00976018/posts/:postId/comment', ensureLoggedIn, async (req, res) => {
    const { postId } = req.params;
    const { comment } = req.body; // assuming the comment is in the request body
    const username = req.session.username;

    // Validate the comment
    if (!comment || comment.trim() === '') {
        return res.status(400).json({ message: 'Comment cannot be empty' });
    }

    try {
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Add the comment to the post's comments array
        const updatedPost = await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { 
                $push: { 
                    comments: { 
                        username, 
                        comment, 
                        timestamp: new Date() 
                    } 
                } 
            }
        );

        if (updatedPost.modifiedCount === 0) {
            return res.status(500).json({ message: 'Error adding comment' });
        }

        res.status(200).json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
});

// Follow another user
app.post('/M00976018/follow/:username?', ensureLoggedIn, async (req, res) => {
    const targetUsername = req.params.username || req.body.username;

    if (!targetUsername) {
        return res.status(400).json({ message: 'Target username is required' });
    }

    const currentUsername = req.session.username;

    if (currentUsername === targetUsername) {
        return res.status(400).json({ message: "You can't follow yourself" });
    }

    try {
        const targetUser = await usersCollection.findOne({ username: targetUsername });
        const currentUser = await usersCollection.findOne({ username: currentUsername });

        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        // Add the target user to the current user's following list (if not already there)
        if (!currentUser.profile.following.includes(targetUsername)) {
            await usersCollection.updateOne(
                { username: currentUsername },
                { $addToSet: { 'profile.following': targetUsername } }
            );
        }

        // Add the current user to the target user's followers list (if not already there)
        if (!targetUser.profile.followers.includes(currentUsername)) {
            await usersCollection.updateOne(
                { username: targetUsername },
                { $addToSet: { 'profile.followers': currentUsername } }
            );
        }

        res.status(200).json({ message: `You are now following ${targetUsername}` });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ message: 'Error following user' });
    }
});

// Unfollow a user
app.delete('/M00976018/follow/:username?', ensureLoggedIn, async (req, res) => {
    const targetUsername = req.params.username || req.body.username;

    if (!targetUsername) {
        return res.status(400).json({ message: 'Target username is required' });
    }

    const currentUsername = req.session.username;

    if (currentUsername === targetUsername) {
        return res.status(400).json({ message: "You can't unfollow yourself" });
    }

    try {
        const targetUser = await usersCollection.findOne({ username: targetUsername });
        const currentUser = await usersCollection.findOne({ username: currentUsername });

        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        // Remove the target user from the current user's following list (if they are there)
        await usersCollection.updateOne(
            { username: currentUsername },
            { $pull: { 'profile.following': targetUsername } }
        );

        // Remove the current user from the target user's followers list (if they are there)
        await usersCollection.updateOne(
            { username: targetUsername },
            { $pull: { 'profile.followers': currentUsername } }
        );

        res.status(200).json({ message: `You have unfollowed ${targetUsername}` });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ message: 'Error unfollowing user' });
    }
});


// Search for users by query
app.get('/M00976018/users/search', ensureLoggedIn, async (req, res) => {
    const query = req.query.q;
    const loggedInUsername = req.session.username; // Assuming `req.user` has the logged-in user's details

    if (!query || query.trim() === '') {
        return res.status(400).json({ message: 'Query parameter "q" is required' });
    }

    try {
        const results = await usersCollection.aggregate([
            {
                $match: {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }
            },
            {
                $project: {
                    username: 1,
                    email: 1,
                    'profile.bio': 1,
                    'profile.followers': 1,
                    'profile.following': 1,
                    isFollowing: {
                        $in: [loggedInUsername, '$profile.followers'] // Check if logged-in user follows them
                    }
                }
            }
        ]).toArray();

        if (results.length === 0) {
            return res.status(404).json({ message: 'No users found matching your query' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error searching for users:', error);
        res.status(500).json({ message: 'Error searching for users' });
    }
});


// Search for content (posts) that matches a query
app.get('/M00976018/contents/search', ensureLoggedIn, async (req, res) => {
    const query = req.query.q;

    if (!query || query.trim() === '') {
        return res.status(400).json({ message: 'Query parameter "q" is required' });
    }

    try {
        // Perform a case-insensitive search for matching content in title or content fields of posts
        const results = await postsCollection.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } }
            ]
        }).project({
            title: 1,
            content: 1,
            username: 1,
            media: 1,
            createdAt: 1,
            likeCount: 1,
            comments: 1
        }).toArray();

        if (results.length === 0) {
            return res.status(404).json({ message: 'No content found matching your query' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error searching for content:', error);
        res.status(500).json({ message: 'Error searching for content' });
    }
});

// Stream file from GridFS
app.get('/M00976018/media/:id', ensureLoggedIn, async (req, res) => {
    const { id } = req.params;

    try {
        const _id = new ObjectId(id);
        const files = await db.collection('uploads.files').find({ _id }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.set('Content-Type', files[0].contentType);
        res.set('Content-Disposition', 'inline; filename="' + files[0].filename + '"');

        const downloadStream = gfs.openDownloadStream(_id);
        downloadStream.pipe(res);

        downloadStream.on('error', (err) => {
            console.error('Error streaming file:', err);
            res.status(500).json({ message: 'Error streaming file' });
        });
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({ message: 'Error fetching file' });
    }
});

// Serve the main page
app.get('/M00976018', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/M00976018`);
});
