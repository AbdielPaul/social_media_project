const express = require('express');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session'); // Required for session management
const jwt = require('jsonwebtoken');

const app = express();
const port = 8080;

// MongoDB connection
const uri = "mongodb+srv://abdielpaul:Abdiel%4024813@cluster0.ebpls.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

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
    secret: 'your-secret-key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true, // Prevent JavaScript access to cookies
        maxAge: 1000 * 60 * 60 // 1-hour session expiration
    }
}));

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// User signup endpoint
const hashPassword = (password) => bcrypt.hashSync(password, 10);

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

// Middleware to protect routes
const ensureLoggedIn = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized access, please log in' });
    }
    next();
};

// Protected route example (user content feed)
app.get('/M00976018/feed', ensureLoggedIn, async (req, res) => {
    try {
        const posts = await postsCollection.find({ username: req.session.username }).toArray();
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).json({ message: 'Error fetching feed' });
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
app.get('/M00976018/status', (req, res) => {
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
            { $set: { username: updatedData.username, email: updatedData.email, profile: updatedData.profile, updatedAt: new Date() } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const { password, ...userProfile } = updatedUser;
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});


// Create new post with optional media file
app.post('/M00976018/posts', ensureLoggedIn, upload.single('media'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const username = req.session.username; // Get username from the authenticated user

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        let media = [];
        if (req.file) {
            // Upload file to GridFS
            const uploadStream = gfs.openUploadStream(req.file.originalname, {
                contentType: req.file.mimetype,
            });

            uploadStream.end(req.file.buffer);

            uploadStream.on('finish', async () => {
                media.push({
                    filename: uploadStream.id.toString(),
                    type: req.file.mimetype,
                });

                // Save the post to MongoDB
                const newPost = { title, content, username, media, createdAt: new Date() };
                await postsCollection.insertOne(newPost);

                res.status(201).json({ message: 'Post created successfully', post: newPost });
            });
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


// Fetch all posts
app.get('/M00976018/posts', async (req, res) => {
    try {
        const posts = await postsCollection.find().sort({ createdAt: -1 }).toArray();
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Error fetching posts' });
    }
});

// Stream file from GridFS
app.get('/M00976018/file/:id', async (req, res) => {
    const fileId = req.params.id;

    try {
        const file = await gfs.find({ _id: ObjectId(fileId) }).toArray();

        if (!file || file.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const readStream = gfs.openDownloadStream(ObjectId(fileId));
        res.set('Content-Type', file[0].contentType);
        readStream.pipe(res);
    } catch (error) {
        console.error('Error streaming file:', error);
        res.status(500).json({ message: 'Error streaming file' });
    }
});

app.get('/M00976018/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/M0076018`);
});
