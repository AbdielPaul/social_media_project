const express = require('express');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
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
        db = client.db('M00976018'); // Use or create a database
        usersCollection = db.collection('users'); // Users collection
        postsCollection = db.collection('posts'); // Posts collection
        gfs = new GridFSBucket(db, { bucketName: 'uploads' }); // GridFS bucket for file storage
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

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// User signup endpoint
const hashPassword = (password) => bcrypt.hashSync(password, 10);

app.post('/M00976018/api/signup', async (req, res) => {
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
app.post('/M00976018/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await usersCollection.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        // Create a token (JWT)
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            'your-secret-key',  // Use a secret key (keep it secure)
            { expiresIn: '1h' } // Token expiration time
        );

        // Return the token and the user profile (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ message: 'Login successful', token, user: userWithoutPassword });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Access denied, token missing' });
    }

    jwt.verify(token, 'your-secret-key', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = decoded; // Attach decoded user info to the request
        next(); // Proceed to the next middleware or route handler
    });
};


// User profile endpoint
app.get('/M00976018/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Exclude the password from the profile response
        const { password, ...userProfile } = user;
        res.status(200).json(userProfile); // Send user profile without password
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});



// Update user profile endpoint
app.put('/M00976018/api/profile', authenticateToken, async (req, res) => {
    try {
        const updatedData = req.body;
        const userId = req.user.userId;

        // Update user profile
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { username :updatedData.username ,email: updatedData.email, profile: updatedData.profile, updatedAt: new Date() } }
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
app.post('/M00976018/api/posts', authenticateToken, upload.single('media'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const username = req.user.username; // Get username from the authenticated user

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
app.get('/M00976018/api/posts', async (req, res) => {
    try {
        const posts = await postsCollection.find().sort({ createdAt: -1 }).toArray();
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Error fetching posts' });
    }
});

// Stream file from GridFS
app.get('/M00976018/api/media/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const file = await gfs.find({ _id: new ObjectId(id) }).toArray();
        if (!file || file.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        gfs.openDownloadStream(new ObjectId(id)).pipe(res);
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({ message: 'Error fetching file' });
    }
});

// Serve index.html under /M00976018 for all other routes
app.get('/M00976018/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/M00976018`);
});




