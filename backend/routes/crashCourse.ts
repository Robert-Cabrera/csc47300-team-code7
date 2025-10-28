import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
const { readUsers, writeUsers } = require('../../utils/userManager');

const router = express.Router();

// GEMINI API CALL FOR CRASH COURSE WITH STRUCTURED OUTPUT
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, userId } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Load the crash course schema
  // Always resolve to the source data_objects directory, not dist
  const crashCoursePromptPath = path.join(__dirname, '../../data_objects/CrashCoursePrompt.json');
    const crashCourseSchema = JSON.parse(fs.readFileSync(crashCoursePromptPath, 'utf8'));

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY || ''
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: crashCourseSchema
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // Parse the actual crash course content from Gemini response
    let crashCourseContent: any = null;
    if (
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) {
      try {
        crashCourseContent = JSON.parse(data.candidates[0].content.parts[0].text);
      } catch (parseError) {
        console.error('Failed to parse crash course content:', parseError);
      }
    }

    // Save to user's crash courses if userId provided and we have valid content
    if (userId && crashCourseContent) {
      const usersData = readUsers();
      const userIndex = usersData.users.findIndex((u: any) => u.id === userId);

      if (userIndex !== -1) {
        const crashCourse = {
          id: `cc_${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...crashCourseContent
        };

        usersData.users[userIndex].crashCourses.unshift(crashCourse);
        writeUsers(usersData);
      }
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Crash course generation error:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

// Get user's crash courses
router.get('/user/:userId', (req: express.Request, res: express.Response) => {
  try {
  const user = (require('../../utils/userManager').findUserByID as Function)(req.params.userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ crashCourses: user.crashCourses || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a crash course
router.delete('/user/:userId/:courseId', (req: express.Request, res: express.Response) => {
  try {
    const usersData = readUsers();
    const userIndex = usersData.users.findIndex((u: any) => u.id === req.params.userId);

    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    usersData.users[userIndex].crashCourses = usersData.users[userIndex].crashCourses.filter((cc: any) => cc.id !== req.params.courseId);

    writeUsers(usersData);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export = router;
