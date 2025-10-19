const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { readUsers, writeUsers, findUserByID } = require('../utils/userManager');

// Configure multer for file uploads 
const upload = multer({ storage: multer.memoryStorage() });

// GEMINI API CALL FOR PDF TOKEN COUNT
router.post('/token-count', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        // Using pdf-parse to extract text from the PDF buffer
        const pdfData = await pdfParse(req.file.buffer);
        const pdfText = pdfData.text;

        // Use Gemini's countTokens API to get accurate token count
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:countTokens?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: pdfText,
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
        }

        const tokenData = await response.json();
        
        res.json({
            totalTokens: tokenData.totalTokens || 0,
            pageCount: pdfData.numpages,
            textLength: pdfText.length
        });
    } catch (err) {
        console.error('Token count error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GEMINI API CALL FOR PDF SUMMARIZATION WITH STRUCTURED OUTPUT
router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        // Ensure a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        // Parse the prompt and userId from the request body
        const { prompt, userId } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        // Load the chunked summary schema from data_objects/SummaryPrompt.json
        const summaryPromptPath = path.join(__dirname, '..', 'data_objects', 'SummaryPrompt.json');
        const chunkedSummarySchema = JSON.parse(fs.readFileSync(summaryPromptPath, 'utf8'));

        // Extract text from PDF
        const pdfData = await pdfParse(req.file.buffer);
        const pdfText = pdfData.text;

        // Use Gemini's structured output feature
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `${prompt}\n\nDocument Content:\n${pdfText}`,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: chunkedSummarySchema
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API error:', errorData);
            throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        
        // Parse the actual summary content from Gemini response
        let summaryContent = null;
        if (data && data.candidates && data.candidates[0] && 
            data.candidates[0].content && data.candidates[0].content.parts && 
            data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
            
            summaryContent = JSON.parse(data.candidates[0].content.parts[0].text);
        }
        
        // Save to user's summaries if userId provided and we have valid content
        if (userId && summaryContent) {
            const usersData = readUsers();
            const userIndex = usersData.users.findIndex(u => u.id === userId);
            
            if (userIndex !== -1) {
                const summary = {
                    // Generate a simple unique ID for the summary (just the timestamp for now)
                    id: `sum_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    fileName: req.file.originalname,
                    ...summaryContent  // Spread the entire summary object from Gemini
                };
                
                // Add to beginning of array (most recent first)
                usersData.users[userIndex].summaries.unshift(summary);
                writeUsers(usersData);
            }
        }
        
        res.json(data);
    } catch (err) {
        console.error('PDF summarization error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user's summaries
router.get('/user/:userId', (req, res) => {
    try {
        const user = findUserByID(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ summaries: user.summaries || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a summary
router.delete('/user/:userId/:summaryId', (req, res) => {
    try {
        const usersData = readUsers();
        const userIndex = usersData.users.findIndex(u => u.id === req.params.userId);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        usersData.users[userIndex].summaries = 
            usersData.users[userIndex].summaries.filter(s => s.id !== req.params.summaryId);
        
        writeUsers(usersData);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
