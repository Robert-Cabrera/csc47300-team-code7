import express, { Request, Response, Router } from 'express';
import { supabase } from '../utils/supabaseClient';
import { findUserByID } from '../utils/userManager';

const router = Router();

/**
 * GET /api/getQuestions
 * Retrieve all submitted questions
 */
router.get('/getQuestions', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('reviewquestiontable')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch questions'
      });
    }

    return res.status(200).json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('Error fetching questions:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/submitQuestion
 * Submit a new question for review
 * Body: {
 *   question: string
 *   correctAnswer: string
 *   course: string
 *   topic: string
 *   difficulty: 'easy' | 'medium' | 'hard'
 *   userId: string
 *   userName: string
 *   userEmail: string
 * }
 * Note: User's profile picture is automatically retrieved from the database
 */
router.post('/submitQuestion', async (req: Request, res: Response) => {
  try {
    const {
      question,
      correctAnswer,
      course,
      topic,
      difficulty,
      userId,
      userName,
      userEmail
    } = req.body;

    // Validate required fields
    if (!question || !correctAnswer || !course || !topic || !difficulty) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question, correctAnswer, course, topic, difficulty'
      });
    }

    // Validate difficulty level
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty level. Must be: easy, medium, or hard'
      });
    }

    // Validate user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get user data to ensure they exist and get their profile picture
    const user = await findUserByID(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Use provided user info or fallback to database info
    const finalUserName = userName || user.name || 'Anonymous';
    const finalUserEmail = userEmail || user.email || 'unknown@example.com';
    const userProfilePicture = user.profilePicture || null;

    // Insert into reviewQuestionTable
    const { data, error } = await supabase
      .from('reviewquestiontable')
      .insert([
        {
          question: question,
          correct_answer: correctAnswer,
          course: course,
          topic: topic,
          difficulty: difficulty,
          user_id: userId,
          user_name: finalUserName,
          user_email: finalUserEmail,
          user_profile_picture: userProfilePicture,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit question'
      });
    }

    console.log('Question submitted successfully:', data);
    return res.status(201).json({
      success: true,
      message: 'Question submitted successfully',
      data: data
    });

  } catch (err) {
    console.error('Error submitting question:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
