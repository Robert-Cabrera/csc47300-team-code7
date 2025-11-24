import express, { Request, Response, Router } from "express";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { SYSTEM_PROMPT, fetchCommunityQuestions, randomlySelectQuestions } from "../utils/practiceTestUtils";
import { supabase } from "../utils/supabaseClient";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../keys.env') });

const router: Router = express.Router();

// Accept either GEMINI_API_KEY or GOOGLE_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const API_KEY = (GEMINI_API_KEY || GOOGLE_API_KEY || '').trim();

if (!API_KEY) {
    console.warn("Missing GEMINI_API_KEY / GOOGLE_API_KEY in environment.");
}

// Define the Zod schema for structured output
const questionSchema = z.object({
    id: z.string().describe("Unique question ID (e.g., 'q1')"),
    question_text: z.string().describe("The full question text"),
    options: z.array(z.string()).length(4).describe("Exactly 4 answer options"),
    correct_answer: z.string().describe("The correct answer matching one of the options"),
    explanation: z.string().describe("Short explanation (1-2 sentences) for why the answer is correct"),
    isFromCommunity: z.boolean().optional().describe("Whether this question is from the community")
});

const testSchema = z.object({
    course: z.string().describe("Name of the course this test belongs to"),
    topic: z.string().describe("Topic or subject focus for this test"),
    duration_minutes: z.number().int().describe("Recommended duration in minutes"),
    num_questions: z.number().int().describe("Total number of questions in the test"),
    instructions: z.string().describe("Brief directions for taking the test"),
    questions: z.array(questionSchema).describe("Array of test questions")
});

router.post("/generate-test", async (req: Request, res: Response) => {
    try {
        let { course, topic, num_questions, difficulty, includeCommunity = false, minCommunityQuestions = 3 } = req.body;

        if (!course || !topic) {
            return res.status(400).json({ error: "Fields 'course' and 'topic' are required." });
        }
        if (!num_questions) num_questions = 5;
        if (typeof num_questions !== "number" || num_questions < 1 || num_questions > 50) {
            return res.status(400).json({ error: "Field 'num_questions' must be 1–50." });
        }
        if (!difficulty) difficulty = "medium";

        console.log(`[Practice Test] Received request with includeCommunity=${includeCommunity} (type: ${typeof includeCommunity})`);
        console.log(`[Practice Test] Full body:`, req.body);

        // Fetch community questions from database only if includeCommunity is true
        let selectedCommunityQuestions: any[] = [];
        let aiQuestionsNeeded = num_questions;

        if (includeCommunity) {
            console.log(`[Practice Test] includeCommunity=true, fetching approved questions for course="${course}", topic="${topic}"`);
            const communityQuestions = await fetchCommunityQuestions(supabase, course, topic);
            console.log(`[Practice Test] Received ${communityQuestions.length} community questions`);
            
            // Determine how many community questions to include
            if (communityQuestions.length >= minCommunityQuestions) {
                // Randomly select questions to fill up to the minimum or available count
                const communityQuestionsToUse = Math.min(
                    communityQuestions.length,
                    Math.ceil(num_questions * 0.3) // Use up to 30% community questions
                );
                selectedCommunityQuestions = randomlySelectQuestions(communityQuestions, communityQuestionsToUse);
                aiQuestionsNeeded = num_questions - selectedCommunityQuestions.length;
                console.log(`[Practice Test] Selected ${selectedCommunityQuestions.length} community questions, asking AI for ${aiQuestionsNeeded} more`);
            } else {
                console.log(`[Practice Test] Only ${communityQuestions.length} community questions found (need at least ${minCommunityQuestions}), using AI for all ${num_questions}`);
            }
        } else {
            console.log(`[Practice Test] includeCommunity=false, using AI for all ${num_questions} questions`);
        }

        // Initialize LangChain model with structured output
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash-lite",
            temperature: 0.7,
            apiKey: API_KEY,
        });

        const structuredModel = model.withStructuredOutput(testSchema, {
            name: "practice_test_generator"
        });

        // Adjust prompt if using community questions
        let userInput = `Generate a practice test with the following parameters:
                        Course: ${course}
                        Topic: ${topic}
                        Number of Questions: ${aiQuestionsNeeded}
                        Difficulty: ${difficulty}

Create ${aiQuestionsNeeded} high-quality multiple-choice questions covering key concepts in ${topic} for the ${course} course. The test should be at a(n) ${difficulty} level.`;

        if (selectedCommunityQuestions.length > 0) {
            // Format community questions for the prompt
            const communityQuestionsFormatted = selectedCommunityQuestions.map((cq, idx) => 
                `${idx + 1}. Question: "${cq.question}"\n   Correct Answer: "${cq.correct_answer}"`
            ).join('\n');

            userInput = `You are generating a practice test that will include ${selectedCommunityQuestions.length} community-submitted questions.

## Community Questions (you MUST include these as-is with their correct answers):
${communityQuestionsFormatted}

For each community question above, you MUST:
1. Keep the exact question text
2. Keep the exact correct answer provided
3. Generate 3 plausible but incorrect answer choices
4. Format them as a multiple-choice question with 4 options total

Additionally, generate ${aiQuestionsNeeded} new high-quality multiple-choice questions to complement the community questions.

Parameters:
- Course: ${course}
- Topic: ${topic}
- Number of New Questions to Generate: ${aiQuestionsNeeded}
- Difficulty: ${difficulty}

The final test will contain ${selectedCommunityQuestions.length} community questions (with your generated wrong answers) + ${aiQuestionsNeeded} new AI-generated questions = ${num_questions} total questions.`;
        }

        // Invoke the model with structured output
        let result = await structuredModel.invoke([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userInput }
        ]);

        console.log(`[Practice Test] AI response received with ${result?.questions?.length || 0} questions`);

        // Create a map of community questions for easy lookup by question text
        const communityQuestionsMap = new Map(
            selectedCommunityQuestions.map(cq => [cq.question, cq])
        );

        // Mark community questions in the AI response
        if (result && Array.isArray(result.questions)) {
            console.log(`[Practice Test] AI generated ${result.questions.length} questions`);
            
            result.questions = result.questions.map((q: any, idx: number) => {
                // Check if this question matches a community question
                const isCommunityQ = communityQuestionsMap.has(q.question_text);
                
                if (isCommunityQ) {
                    const communityQData = communityQuestionsMap.get(q.question_text)!;
                    console.log(`[Practice Test] Found community question at index ${idx}: "${q.question_text.substring(0, 50)}..."`);
                    
                    return {
                        ...q,
                        id: `community_q${idx + 1}`,
                        isFromCommunity: true,
                        communityUserName: communityQData.user_name,
                        communityUserProfilePicture: communityQData.user_profile_picture || null
                    };
                } else {
                    // Mark AI questions as not from community
                    return {
                        ...q,
                        isFromCommunity: false
                    };
                }
            });

            // Shuffle questions
            const shuffledQuestions = result.questions.sort(() => Math.random() - 0.5);
            result.questions = shuffledQuestions.slice(0, num_questions);
            result.num_questions = result.questions.length;
            
            // Count community questions in final result
            const communityCount = result.questions.filter((q: any) => q.isFromCommunity).length;
            console.log(`[Practice Test] Final test: ${result.num_questions} total questions (${communityCount} from community, ${result.questions.length - communityCount} from AI)`);
        }

        return res.status(200).json(result);
    } catch (err: any) {
        console.error("Server error:", err);
        return res.status(500).json({
            error: "Internal server error",
            details: err.message
        });
    }
});

export = router;

