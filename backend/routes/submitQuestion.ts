import express, { Request, Response, Router } from 'express';
import { supabase } from '../utils/supabaseClient';
import { findUserByID } from '../utils/userManager';

const router = Router();

/**
 * GET /api/getQuestions
 * Retrieve paginated submitted questions with optional status filter
 * Query params:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 10, max: 100)
 *   - status: filter by status ('pending', 'approved', 'rejected', or 'all' for no filter)
 */
router.get('/getQuestions', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const statusFilter = req.query.status as string || 'all';
    const offset = (page - 1) * limit;

    // Build query with optional status filter
    let query = supabase
      .from('reviewquestiontable')
      .select('id, question, correct_answer, course, topic, difficulty, user_id, user_name, user_email, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply status filter if specified and not 'all'
    if (statusFilter !== 'all' && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    // Fetch paginated data
    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch questions'
      });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return res.status(200).json({
      success: true,
      data: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages
      }
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

/**
 * PATCH /api/updateQuestionStatus
 * Body: { id: number, status: 'approved' | 'rejected' | 'pending' }
 * Updates the status of a submitted question
 */
router.patch('/updateQuestionStatus', async (req: Request, res: Response) => {
  try {
    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'Missing id or status' });
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be approved, rejected, or pending' });
    }

    const { data, error } = await supabase
      .from('reviewquestiontable')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to update status' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating question status:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/getProfilePicture/:userId
 * Retrieve a user's profile picture
 */
router.get('/getProfilePicture/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId'
      });
    }

    const { data, error } = await supabase
      .from('reviewquestiontable')
      .select('user_profile_picture')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Profile picture not found'
      });
    }

    return res.status(200).json({
      success: true,
      profilePicture: data.user_profile_picture
    });
  } catch (err) {
    console.error('Error fetching profile picture:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
