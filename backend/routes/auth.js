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
        await simulateDelay();
        
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
        await simulateDelay();
        
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

// Get user by ID (for dashboard history) - DEPRECATED, keeping for backward compatibility
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        const usersData = readUsers();
        const user = usersData.users.find(u => u.id === userId);
        
        if (user) {
            res.json({
                id: user.id,
                username: user.username,
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
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }
        
        const usersData = readUsers();
        const user = usersData.users.find(u => 
            u.username === username && u.password === password
        );
        
        if (user) {
            res.json({ 
                success: true, 
                user: { 
                    id: user.id, 
                    username: user.username, 
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
    // TODO: Implement registration logic
    /*
        There's many util functions already made for user management in
        backend/utils/userManager.js that can be used here.

        For example:
        readUsers() - to read existing users
        generateUserId() - to create a new unique user ID (incremental _001, _002, etc)
        insertUserSorted(newUser) - to insert the new user in sorted order by ID
    */
});

module.exports = router;
