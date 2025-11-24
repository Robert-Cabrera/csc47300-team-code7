#!/usr/bin/env python3
"""
NoteSmith Questions Injector with AI Generation
Generates questions using Gemini API and submits them to the backend
"""

import os
import json
import requests
import re
from pathlib import Path
from typing import List, Tuple

# ============================================================
# CONFIGURATION SECTION - Edit these variables as needed
# ============================================================

API_BASE = "http://localhost:3000"
COURSE = "CSC473"
TOPIC = "JAVASCRIPT"

# Number of questions per difficulty level
EASY_COUNT = 4
MEDIUM_COUNT = 2
HARD_COUNT = 0

# User credentials for submitting questions
USERS = [
    ("ivy.rodriguez0@example.com",  "TestPassword123!"),
    ("tina.morgan1@test.com",       "TestPassword123!"),
    ("mia.cooper2@icloud.com",      "TestPassword123!"),
]

# Load API key from keys.env
KEYS_ENV_PATH = Path(__file__).parent.parent / "backend" / "keys.env"

if not KEYS_ENV_PATH.exists():
    print(f"✗ Error: keys.env not found at {KEYS_ENV_PATH}")
    exit(1)

GEMINI_API_KEY = None
with open(KEYS_ENV_PATH) as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            GEMINI_API_KEY = line.split("=", 1)[1].strip()
            break

if not GEMINI_API_KEY:
    print("✗ Error: GEMINI_API_KEY not found in keys.env")
    exit(1)

print("=" * 60)
print("NoteSmith Questions Injector with AI Generation")
print("=" * 60)
print(f"Course: {COURSE}")
print(f"Topic: {TOPIC}")
print(f"Easy Questions: {EASY_COUNT}")
print(f"Medium Questions: {MEDIUM_COUNT}")
print(f"Hard Questions: {HARD_COUNT}")
print()

# ============================================================
# FUNCTIONS FOR AI-BASED QUESTION GENERATION
# ============================================================


def generate_questions(difficulty: str, count: int) -> List[Tuple[str, str]]:
    """Generate questions using Gemini API"""
    prompt = f"""Generate {count} multiple choice questions for a university course on {COURSE}, specifically about {TOPIC}, at {difficulty} difficulty level.

Format each question EXACTLY as follows (one per line):
QUESTION: <question text>
CORRECT: <correct answer text>
---

Make sure each question is educational and the answers are scientifically/technically accurate. The correct answer should be clearly the best answer among the options."""

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
    }
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        # Extract text from response
        text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        
        # Parse questions from text
        questions = []
        lines = text.split("\n")
        current_question = None
        current_correct = None
        
        for line in lines:
            line = line.strip()
            if line.startswith("QUESTION:"):
                if current_question and current_correct:
                    questions.append((current_question, current_correct))
                current_question = line.replace("QUESTION:", "").strip()
                current_correct = None
            elif line.startswith("CORRECT:"):
                current_correct = line.replace("CORRECT:", "").strip()
        
        # Don't forget the last question
        if current_question and current_correct:
            questions.append((current_question, current_correct))
        
        return questions[:count]
    except Exception as e:
        print(f"✗ Error generating {difficulty} questions: {e}")
        return []


def get_token(email: str, password: str) -> str:
    """Get auth token (user ID) from login"""
    url = f"{API_BASE}/api/login"
    data = {
        "username": email,
        "password": password
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        result = response.json()
        
        # Check if login was successful
        if result.get("success"):
            user = result.get("user", {})
            return user.get("id", "")
        else:
            print(f"  Login error: {result.get('error', 'Unknown error')}")
            return ""
    except Exception as e:
        print(f"✗ Error logging in {email}: {e}")
        return ""


def submit_question(user_id: str, question: str, correct_answer: str, difficulty: str) -> bool:
    """Submit a question to the backend"""
    url = f"{API_BASE}/api/submitQuestion"
    payload = {
        "course": COURSE,
        "topic": TOPIC,
        "question": question,
        "correctAnswer": correct_answer,
        "difficulty": difficulty,
        "userId": user_id
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        result = response.json()
        return result.get("success", False)
    except Exception as e:
        print(f"✗ Error submitting question: {e}")
        return False


# ============================================================
# MAIN EXECUTION
# ============================================================

print("Step 0: Generating AI questions from Gemini API...")
print()

print("Generating Easy Questions...")
easy_questions = generate_questions("easy", EASY_COUNT)

print("Generating Medium Questions...")
medium_questions = generate_questions("medium", MEDIUM_COUNT)

print("Generating Hard Questions...")
hard_questions = generate_questions("hard", HARD_COUNT)

print("✓ AI question generation complete")
print()

print("Step 1: Logging in users...")
user_ids = {}
for email, password in USERS:
    user_id = get_token(email, password)
    if user_id:
        user_ids[email] = user_id
        print(f"✓ Logged in {email}")
    else:
        print(f"✗ Failed to login {email}")

if not user_ids:
    print("✗ Failed to login any users. Exiting.")
    exit(1)

print()
print("Step 2: Submitting questions...")
print()

total_submitted = 0
user_index = 0
user_list = list(user_ids.items())

# Submit easy questions
print("Easy Questions:")
for question, correct in easy_questions:
    email, user_id = user_list[user_index % len(user_list)]
    if submit_question(user_id, question, correct, "easy"):
        print(f"  ✓ Submitted by {email}")
        total_submitted += 1
    else:
        print(f"  ✗ Failed for {email}")
    user_index += 1

print()
print("Medium Questions:")
for question, correct in medium_questions:
    email, user_id = user_list[user_index % len(user_list)]
    if submit_question(user_id, question, correct, "medium"):
        print(f"  ✓ Submitted by {email}")
        total_submitted += 1
    else:
        print(f"  ✗ Failed for {email}")
    user_index += 1

print()
print("Hard Questions:")
for question, correct in hard_questions:
    email, user_id = user_list[user_index % len(user_list)]
    if submit_question(user_id, question, correct, "hard"):
        print(f"  ✓ Submitted by {email}")
        total_submitted += 1
    else:
        print(f"  ✗ Failed for {email}")
    user_index += 1

print()
print("=" * 60)
print(f"Summary: Successfully submitted {total_submitted} questions")
print(f"Course: {COURSE}")
print(f"Topic: {TOPIC}")
print("=" * 60)
