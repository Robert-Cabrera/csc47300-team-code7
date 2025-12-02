import express, { Request, Response, Router } from 'express';
import { supabase } from '../utils/supabaseClient';
import { findUserByID } from '../utils/userManager';

const router = Router();

// READ or query submitted questions 
router.get('/getQuestions', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const statusFilter = req.query.status as string || 'all';
    const offset = (page - 1) * limit;

    // ! CHECKMARK 1.2
    /* 

      ? THIS IS A READ OPERATION

      ? SUPABASE DOCS ------------------------------------------------
    
        select(columns?, options?)

        Perform a ``SELECT`` query on the table or view.

        By default, Supabase projects return a maximum of 1,000 rows. 
        This setting can be changed in your project's API settings. 
        It's recommended that you keep it low to limit the payload size of accidental 
        or malicious requests. You can use range() queries to paginate through your data.
      ? ---------------------------------------------------------------
    
    */
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

// ! CHECKMARK 1.5: Most of the work gets done in the backend (API route)
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

    // ! CHECKMARK 1.1
    /* 

      ? THIS IS A INSERT OPERATION

      ? SUPABASE DOCS ------------------------------------------------
    
        insert(values, options?)

        Performs a ``INSERT`` into the table.
        
        Inserts new rows into the table. You can insert a single row by passing an object, 
        or multiple rows by passing an array of objects.
    
      ? ---------------------------------------------------------------
    
    */
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


router.patch('/updateQuestionStatus', async (req: Request, res: Response) => {
  try {
    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'Missing id or status' });
    }

    if (!['approved', 'rejected', 'pending', 'deleted'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be approved, rejected, pending, or deleted' });
    }

    // ! CHECKMARK 1.3
    /* 

      ? THIS IS AN UPDATE OPERATION

      ? SUPABASE DOCS ------------------------------------------------
    
        update(values, options)

        Perform an UPDATE on the table or view.

        By default, updated rows are not returned. To return it, 
        chain the call with .select() after filters.

        update() should always be combined with Filters to target the item(s) 
        you wish to update.

      ? ---------------------------------------------------------------
    
    */
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

/**
 * GET /api/filterOptions
 * Get available courses and topics for filter dropdowns
 */
router.get('/filterOptions', async (req: Request, res: Response) => {
  try {
    // Fetch all distinct courses
    const { data: coursesData, error: coursesError } = await supabase
      .from('reviewquestiontable')
      .select('course')
      .order('course', { ascending: true });

    if (coursesError) {
      console.error('Supabase error fetching courses:', coursesError);
      return res.status(500).json({
        success: false,
        error: coursesError.message || 'Failed to fetch courses'
      });
    }

    // Fetch all distinct topics
    const { data: topicsData, error: topicsError } = await supabase
      .from('reviewquestiontable')
      .select('topic')
      .order('topic', { ascending: true });

    if (topicsError) {
      console.error('Supabase error fetching topics:', topicsError);
      return res.status(500).json({
        success: false,
        error: topicsError.message || 'Failed to fetch topics'
      });
    }

    // Get unique courses and topics
    const uniqueCourses = [...new Set(coursesData?.map((row: any) => row.course).filter(Boolean) || [])];
    const uniqueTopics = [...new Set(topicsData?.map((row: any) => row.topic).filter(Boolean) || [])];

    return res.status(200).json({
      success: true,
      courses: uniqueCourses,
      topics: uniqueTopics
    });
  } catch (err) {
    console.error('Error fetching filter options:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/user/:userId/questions
 * Get questions submitted by a specific user
 * Query params:
 *   - limit: max items to return (default: 5)
 */
router.get('/user/:userId/questions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 5));

    const { data, error, count } = await supabase
      .from('reviewquestiontable')
      .select('id, question, correct_answer, course, topic, difficulty, status, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user questions'
      });
    }

    return res.status(200).json({
      success: true,
      items: data || [],
      total: count || 0
    });

  } catch (err) {
    console.error('Error fetching user questions:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/getUser/:userId
 * Get user profile information and statistics
 */
router.get('/getUser/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId'
      });
    }

    // Get user data from users table
    const user = await findUserByID(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's question statistics from reviewquestiontable
    const { data: questionsData, error: questionsError, count } = await supabase
      .from('reviewquestiontable')
      .select('status', { count: 'exact' })
      .eq('user_id', userId);

    if (questionsError) {
      console.error('Supabase error:', questionsError);
      return res.status(500).json({
        success: false,
        error: questionsError.message || 'Failed to fetch user statistics'
      });
    }

    // Calculate question statistics
    const questions = questionsData || [];
    const totalQuestions = count || 0;
    const approvedQuestions = questions.filter((q: any) => q.status === 'approved').length;
    const rejectedQuestions = questions.filter((q: any) => q.status === 'rejected').length;
    const pendingQuestions = questions.filter((q: any) => q.status === 'pending').length;

    return res.status(200).json({
      success: true,
      id: user.id,
      name: user.name || 'Anonymous',
      email: user.email,
      profilePicture: user.profilePicture || null,
      totalQuestions,
      approvedQuestions,
      rejectedQuestions,
      pendingQuestions,
      joinDate: user.createdAt
    });
  } catch (err) {
    console.error('Error fetching user data:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/getUserQuestions/:userId
 * Get all questions submitted by a specific user
 * Query params:
 *   - limit: max items to return (default: 100)
 */
router.get('/getUserQuestions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100));

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId'
      });
    }

    const { data, error, count } = await supabase
      .from('reviewquestiontable')
      .select('id, question, correct_answer, course, topic, difficulty, status, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user questions'
      });
    }

    return res.status(200).json({
      success: true,
      questions: data || [],
      total: count || 0
    });

  } catch (err) {
    console.error('Error fetching user questions:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;

