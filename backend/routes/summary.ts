import express from 'express';
import fetch from 'node-fetch';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';

const { readUsers, writeUsers, findUserByID } = require('../../utils/userManager');

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// GEMINI API CALL FOR PDF TOKEN COUNT
router.post('/token-count', upload.single('pdf'), async (req: express.Request, res: express.Response) => {
  try {
    // @ts-ignore - multer adds file to request
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // @ts-ignore
    const pdfData = await (pdfParse as any)(req.file.buffer);
    const pdfText = pdfData.text;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:countTokens?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [ { parts: [ { text: pdfText } ] } ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await response.json();

    return res.json({
      totalTokens: tokenData.totalTokens || 0,
      pageCount: pdfData.numpages,
      textLength: pdfText.length
    });
  } catch (err: any) {
    console.error('Token count error:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

// GEMINI API CALL FOR PDF SUMMARIZATION WITH STRUCTURED OUTPUT
router.post('/', upload.single('pdf'), async (req: express.Request, res: express.Response) => {
  try {
    // @ts-ignore
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    const { prompt, userId } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Always resolve to the source data_objects directory, not dist
  const summaryPromptPath = path.join(__dirname, '../../data_objects/SummaryPrompt.json');
    const chunkedSummarySchema = JSON.parse(fs.readFileSync(summaryPromptPath, 'utf8'));

    // @ts-ignore
    const pdfData = await (pdfParse as any)(req.file.buffer);
    const pdfText = pdfData.text;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [ { parts: [ { text: `${prompt}\n\nDocument Content:\n${pdfText}` } ] } ],
          generationConfig: { responseMimeType: 'application/json', responseSchema: chunkedSummarySchema }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    let summaryContent: any = null;
    if (
      data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) {
      try {
        summaryContent = JSON.parse(data.candidates[0].content.parts[0].text);
      } catch (e) {
        console.error('Failed to parse summary content:', e);
      }
    }

    if (userId && summaryContent) {
      const usersData = readUsers();
      const userIndex = usersData.users.findIndex((u: any) => u.id === userId);
      if (userIndex !== -1) {
  const originalName = (req as any).file?.originalname || 'uploaded.pdf';
  const summary = { id: `sum_${Date.now()}`, createdAt: new Date().toISOString(), fileName: originalName, ...summaryContent };
        usersData.users[userIndex].summaries.unshift(summary);
        writeUsers(usersData);
      }
    }

    return res.json(data);
  } catch (err: any) {
    console.error('PDF summarization error:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

// Get user's summaries
router.get('/user/:userId', (req: express.Request, res: express.Response) => {
  try {
    const user = (findUserByID as Function)(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ summaries: user.summaries || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

// Delete a summary
router.delete('/user/:userId/:summaryId', (req: express.Request, res: express.Response) => {
  try {
    const usersData = readUsers();
    const userIndex = usersData.users.findIndex((u: any) => u.id === req.params.userId);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    usersData.users[userIndex].summaries = usersData.users[userIndex].summaries.filter((s: any) => s.id !== req.params.summaryId);
    writeUsers(usersData);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

export = router;
