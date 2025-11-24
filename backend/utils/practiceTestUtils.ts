export const SYSTEM_PROMPT = `
You are a Test Generation AI that creates multiple-choice practice tests for students.

You will be given a JSON input with the following fields:
{
  "course": "string — the academic course name (e.g., 'Computer Organization')",
  "topic": "string — the specific topic or subject area to focus on (e.g., 'Memory Hierarchy')",
  "num_questions": "integer — how many questions to generate"
}

## IMPORTANT: Community Questions Processing
If the prompt includes a "Community Questions" section, you MUST:
1. Include those questions EXACTLY as provided in the output
2. Keep the exact question text and correct answer from the community submission
3. Generate 3 plausible but INCORRECT answer choices for each community question
4. These community questions should be mixed with any new questions you generate
5. The total output should include both community questions (with generated wrong answers) and new AI-generated questions

Your task is to generate a complete practice test in **strict JSON format**.
The output must match the exact structure shown below — no markdown, no explanations, no arrays at the top level, and no missing fields.

---

### REQUIRED OUTPUT FORMAT
The output must be a single JSON object with the following structure:

{
  "test_id": "string — unique identifier for this test (e.g., 'pt_20251023_001')",
  "course": "string — name of the course this test belongs to",
  "topic": "string — topic or subject focus for this test",
  "duration_minutes": "integer — recommended duration in minutes (e.g., 5 minutes per question)",
  "num_questions": "integer — total number of questions in the test",
  "instructions": "string — brief directions for taking the test",
  "questions": [
    {
      "id": "string — unique question ID (e.g., 'q1')",
      "question_text": "string — the full question text",
      "options": [
        "string — option A",
        "string — option B",
        "string — option C",
        "string — option D"
      ],
      "correct_answer": "string — the correct answer exactly matching one of the options",
      "explanation": "string — short explanation (1–2 sentences) for why the answer is correct"
    }
  ]
}

---

### EXAMPLE OUTPUT
Below is an example of what a correctly formatted output looks like:

{
  "course": "Computer Organization",
  "topic": "Memory Hierarchy",
  "duration_minutes": 25,
  "num_questions": 5,
  "instructions": "Select the best answer for each question. You have 25 minutes to complete this test.",
  "questions": [
    {
      "id": "q1",
      "question_text": "Which type of memory is closest to the CPU?",
      "options": ["Main Memory", "Cache Memory", "Virtual Memory", "Hard Disk"],
      "correct_answer": "Cache Memory",
      "explanation": "Cache memory stores frequently accessed data and instructions to speed up CPU operations."
    },
    {
      "id": "q2",
      "question_text": "Which of the following has the largest capacity?",
      "options": ["Cache", "Registers", "RAM", "Hard Disk"],
      "correct_answer": "Hard Disk",
      "explanation": "Hard disks store significantly more data than RAM or cache, but are much slower."
    }
  ]
}

---

### STRICT OUTPUT RULES
1. The output MUST be a **single JSON object**, not an array, not markdown, and not wrapped in any text.  
2. All keys listed in the format are **required** — none may be omitted or renamed.  
3. Every question MUST have exactly 4 options and exactly 1 correct answer.  
4. All explanations MUST be factual, concise, and 1–2 sentences long.  
5. The output MUST be valid JSON — parsable directly with \`JSON.parse()\`.  
6. Do NOT include comments, prefixes, or extra keys.  
7. Do NOT include schema definitions or descriptions — only actual field values.  
8. Use the provided input fields ('course', 'topic', 'num_questions') to generate contextually accurate content.

Your entire response should consist of **only the valid JSON object** representing the test.
`;

const TEST_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    course: { type: "string", minLength: 1 },
    topic: { type: "string", minLength: 1 },
    created_at: { type: "string", format: "date-time" },
    duration_minutes: { type: "integer", minimum: 1, maximum: 180 },
    num_questions: { type: "integer", minimum: 1 },
    instructions: { type: "string", minLength: 1 },
    questions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          question_text: { type: "string", minLength: 1 },
          options: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 4,
            maxItems: 4,
            uniqueItems: true,
            description: "Exactly four distinct answer options."
          },
          correct_answer: { type: "string", minLength: 1 },
          explanation: { type: "string", minLength: 1 }
        },
        required: ["id", "question_text", "options", "correct_answer", "explanation"]
      }
    }
  },
  required: [
    "test_id",
    "course",
    "topic",
    "created_at",
    "duration_minutes",
    "num_questions",
    "instructions",
    "questions"
  ]
};

/**
 * Community question interface
 */
export interface CommunityQuestion {
  id?: number;
  question: string;
  correct_answer: string;
  course: string;
  topic: string;
  difficulty: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_profile_picture?: string | null;
  status: string;
  created_at: string;
}

/**
 * Processed community question for practice test
 */
export interface ProcessedCommunityQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  isFromCommunity: true;
  communityData?: {
    user_name: string;
    user_profile_picture?: string | null;
  };
}

/**
 * Fetch approved community questions from Supabase matching course and topic
 * @param supabase - Supabase client instance
 * @param course - Course name to match
 * @param topic - Topic to match
 * @returns Array of community questions or empty array if error
 */
export async function fetchCommunityQuestions(
  supabase: any,
  course: string,
  topic: string
): Promise<CommunityQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('reviewquestiontable')
      .select('id, question, correct_answer, course, topic, difficulty, user_id, user_name, user_email, user_profile_picture, status, created_at')
      .eq('status', 'approved')
      .ilike('course', `%${course}%`)
      .ilike('topic', `%${topic}%`);

    if (error) {
      console.error('Error fetching community questions:', error.message);
      return [];
    }

    console.log(`[Community Questions] Found ${(data || []).length} matching questions for course="${course}", topic="${topic}"`);

    // Validate questions have all required fields
    const validated = (data || []).filter(q => 
      q.question && 
      q.correct_answer && 
      q.course && 
      q.topic &&
      q.user_name
    );

    console.log(`[Community Questions] Validated ${validated.length} questions (had all required fields)`);
    return validated;
  } catch (err: any) {
    console.error('Exception fetching community questions:', err.message);
    return [];
  }
}

/**
 * Convert community question to practice test question format
 * @param communityQuestion - Community question from database
 * @param index - Index for question ID
 * @returns Processed question ready for practice test
 */
export function convertCommunityQuestion(
  communityQuestion: CommunityQuestion,
  index: number
): ProcessedCommunityQuestion {
  // For now, use the correct answer as placeholder for options
  // In a real scenario, you might want to generate wrong options
  const options = [communityQuestion.correct_answer];
  
  return {
    id: `community_q${index + 1}`,
    question_text: communityQuestion.question,
    options: options,
    correct_answer: communityQuestion.correct_answer,
    explanation: `Community-submitted question by ${communityQuestion.user_name}`,
    isFromCommunity: true,
    communityData: {
      user_name: communityQuestion.user_name,
      user_profile_picture: communityQuestion.user_profile_picture || null
    }
  };
}

/**
 * Randomly select N questions from array
 * @param arr - Array to select from
 * @param n - Number of items to select
 * @returns Array of randomly selected items
 */
export function randomlySelectQuestions<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return [];
  const count = Math.min(n, arr.length);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
