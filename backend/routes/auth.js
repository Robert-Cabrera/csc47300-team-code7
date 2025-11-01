const express = require('express');
const router = express.Router();
const { readUsers, generateUserId, insertUserSorted } = require('../utils/userManager');

// Constants
const ITEMS_PER_PAGE = 4;
const WAITING_RANGE_MS = 800;

// Helper function to simulate network/processing delay
function simulateDelay() {
    return new Promise(resolve => 
        setTimeout(resolve, WAITING_RANGE_MS + Math.random() * WAITING_RANGE_MS)
    );
}

// Get user stats counts only so that dashboard can show totals
router.get('/user/:userId/stats', (req, res) => {
    try {
        const { userId } = req.params;
        
        const usersData = readUsers();
        const user = usersData.users.find(u => u.id === userId);
        
        if (user) {
            res.json({
                totalSummaries: (user.summaries || []).length,
                totalCrashCourses: (user.crashCourses || []).length
            });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get user summaries (paginated with added delay)
router.get('/user/:userId/summaries', async (req, res) => {
    try {

        // Parse the start and end query parameters if not, default to
        // 0 and ITEMS_PER_PAGE respectively
        const { userId } = req.params;
        const start = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || ITEMS_PER_PAGE;
        
        // Simulate network/processing delay
        //await simulateDelay();
        
        const usersData = readUsers();
        const user = usersData.users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const allSummaries = user.summaries || [];
        const items = allSummaries.slice(start, start + limit);
        
        res.json({
            items,
            hasMore: start + limit < allSummaries.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get user crash courses (paginated with added delay)
router.get('/user/:userId/crash-courses', async (req, res) => {
    try {

        // Parse the start and end query parameters if not, default to
        // 0 and ITEMS_PER_PAGE respectively
        const { userId } = req.params;
        const start = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || ITEMS_PER_PAGE;
        
        // Simulate network/processing delay
        //await simulateDelay();
        
        const usersData = readUsers();
        const user = usersData.users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const allCourses = user.crashCourses || [];
        const items = allCourses.slice(start, start + limit);
        
        res.json({
            items,
            hasMore: start + limit < allCourses.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get user by ID (for dashboard history) 
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        const usersData = readUsers();
        const user = usersData.users.find(u => u.id === userId);
        
        if (user) {
            res.json({
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                crashCourses: user.crashCourses || [],
                summaries: user.summaries || []
            });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Login endpoint
router.post('/login', (req, res) => {
    try {
        // Accept 'username' which may actually be either the username or the email
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }

        const usersData = readUsers();
        // Allow login by username OR email (keeps existing payload shape)
        const user = usersData.users.find(u => 
            (u.username === username || u.email === username) && u.password === password
        );

        if (user) {
            res.json({ 
                success: true, 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    name: user.name,
                    email: user.email,
                    profilePicture: user.profilePicture 
                } 
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Register endpoint
router.post('/register', (req, res) => {
    try {
        const { username, name, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Username, email and password are required' });
        }

        const usersData = readUsers();

        // Check for existing username or email
        const exists = usersData.users.find(u => u.username === username || u.email === email);
        if (exists) {
            return res.status(409).json({ success: false, error: 'Username or email already in use' });
        }

        // Create new user object
        const newId = generateUserId();
        const newUser = {
            id: newId,
            username,
            name,
            email,
            password, // NOTE: plaintext for demo only
            createdAt: new Date().toISOString(),
            profilePicture: "",
            crashCourses: [],
            summaries: []
        };

        // Insert and persist
        insertUserSorted(newUser);

    // Return minimal public user info (include name so frontend displays it)
    res.status(201).json({ success: true, user: { id: newUser.id, username: newUser.username, name: newUser.name, email: newUser.email, profilePicture: newUser.profilePicture } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
