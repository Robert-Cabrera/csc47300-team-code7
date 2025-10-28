const express = require("express");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { z } = require("zod");
const { SYSTEM_PROMPT } = require("../utils/practiceTestUtils");
require('dotenv').config({ path: require('path').join(__dirname, '../keys.env') });

const router = express.Router();

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
    explanation: z.string().describe("Short explanation (1-2 sentences) for why the answer is correct")
});

const testSchema = z.object({
    course: z.string().describe("Name of the course this test belongs to"),
    topic: z.string().describe("Topic or subject focus for this test"),
    duration_minutes: z.number().int().describe("Recommended duration in minutes"),
    num_questions: z.number().int().describe("Total number of questions in the test"),
    instructions: z.string().describe("Brief directions for taking the test"),
    questions: z.array(questionSchema).describe("Array of test questions")
});

router.post("/generate-test", async (req, res) => {
    try {
        let { course, topic, num_questions } = req.body;

        if (!course || !topic) {
            return res.status(400).json({ error: "Fields 'course' and 'topic' are required." });
        }
        if (!num_questions) num_questions = 5;
        if (typeof num_questions !== "number" || num_questions < 1 || num_questions > 50) {
            return res.status(400).json({ error: "Field 'num_questions' must be 1–50." });
        }

        // Initialize LangChain model with structured output. Pass the API key
        // explicitly (ChatGoogleGenerativeAI looks for GOOGLE_API_KEY by
        // default, or accepts apiKey in the constructor).
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash-lite",
            temperature: 0.7,
            apiKey: API_KEY,
        });

        // Create structured output model
        const structuredModel = model.withStructuredOutput(testSchema, {
            name: "practice_test_generator"
        });

        const userInput = `Generate a practice test with the following parameters:
Course: ${course}
Topic: ${topic}
Number of Questions: ${num_questions}

Create ${num_questions} high-quality multiple-choice questions covering key concepts in ${topic} for the ${course} course.`;

        // Invoke the model with structured output
        const result = await structuredModel.invoke([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userInput }
        ]);

        return res.status(200).json(result);
    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({
            error: "Internal server error",
            details: err.message
        });
    }
});

module.exports = router;
