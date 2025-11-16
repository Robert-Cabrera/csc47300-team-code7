#!/usr/bin/env python3
"""
Script to generate test data and submit questions through NoteSmith API endpoints.
Uses Gemini to generate realistic questions and submits them via random user accounts.

Usage:
    python inject_questions.py --pfp-dir ./pfp_icons
    
Once you provide the PFP icons directory, the script will:
1. Register random users with profile pictures
2. Use Gemini to generate 60 questions in JSON format
3. Submit all questions through the /api/submitQuestion endpoint
"""

import os
import sys
import json
import random
import base64
import requests
import argparse
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../backend/keys.env'))

# Configuration
API_BASE_URL = 'http://localhost:3000'
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Validate API key
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in keys.env")
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)


class NoteSmithDataInjector:
    """Handles user registration and question submission to NoteSmith API."""

    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.users: List[Dict[str, Any]] = []
        self.questions: List[Dict[str, Any]] = []

    def register_user(
        self,
        username: str,
        email: str,
        name: str,
        password: str = 'TestPassword123!',
        profile_picture: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Register a new user and return user data."""
        try:
            payload = {
                'username': username,
                'email': email,
                'name': name,
                'password': password
            }

            response = requests.post(
                f'{self.base_url}/api/register',
                json=payload,
                timeout=10
            )

            if response.status_code == 201:
                user_data = response.json().get('user', {})
                
                # If profile picture provided, update user
                if profile_picture:
                    self.update_user_profile(user_data['id'], profile_picture)
                    user_data['profilePicture'] = profile_picture

                self.users.append(user_data)
                print(f"✓ Registered user: {username} ({email})")
                return user_data
            elif response.status_code == 409:
                print(f"⚠ User already exists: {username}")
                return None
            else:
                print(f"✗ Failed to register {username}: {response.text}")
                return None

        except Exception as e:
            print(f"✗ Error registering user {username}: {str(e)}")
            return None

    def update_user_profile(self, user_id: str, profile_picture: str) -> bool:
        """Update user profile with picture."""
        try:
            payload = {
                'profilePicture': profile_picture
            }

            response = requests.put(
                f'{self.base_url}/api/user/{user_id}',
                json=payload,
                timeout=10
            )

            return response.status_code == 200

        except Exception as e:
            print(f"✗ Error updating profile for user {user_id}: {str(e)}")
            return False

    def submit_question(
        self,
        question: str,
        correct_answer: str,
        course: str,
        topic: str,
        difficulty: str,
        user_id: str,
        user_name: str,
        user_email: str
    ) -> bool:
        """Submit a question through the API."""
        try:
            payload = {
                'question': question,
                'correctAnswer': correct_answer,
                'course': course,
                'topic': topic,
                'difficulty': difficulty,
                'userId': user_id,
                'userName': user_name,
                'userEmail': user_email
            }

            response = requests.post(
                f'{self.base_url}/api/submitQuestion',
                json=payload,
                timeout=10
            )

            if response.status_code == 201:
                return True
            else:
                print(f"✗ Failed to submit question: {response.text}")
                return False

        except Exception as e:
            print(f"✗ Error submitting question: {str(e)}")
            return False

    def load_pfp_icons(self, pfp_dir: str) -> List[str]:
        """Load profile picture icons and convert to base64 data URLs."""
        pfp_data_urls = []

        if not os.path.isdir(pfp_dir):
            print(f"✗ PFP directory not found: {pfp_dir}")
            return []

        image_files = [f for f in os.listdir(pfp_dir) 
                      if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

        if not image_files:
            print(f"⚠ No image files found in {pfp_dir}")
            return []

        print(f"Found {len(image_files)} profile pictures")

        for filename in image_files:
            filepath = os.path.join(pfp_dir, filename)
            try:
                with open(filepath, 'rb') as f:
                    image_data = f.read()
                    # Detect MIME type by file magic bytes instead of extension
                    if image_data[:8] == b'\x89PNG\r\n\x1a\n':
                        mime_type = 'image/png'
                    elif image_data[:3] == b'\xff\xd8\xff':
                        mime_type = 'image/jpeg'
                    else:
                        # Fallback to extension
                        ext = os.path.splitext(filename)[1].lower()
                        mime_map = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}
                        mime_type = mime_map.get(ext, 'image/png')

                    # Convert to base64 data URL
                    b64_data = base64.b64encode(image_data).decode('utf-8')
                    data_url = f"data:{mime_type};base64,{b64_data}"
                    pfp_data_urls.append(data_url)
            except Exception as e:
                print(f"⚠ Error loading {filename}: {str(e)}")

        return pfp_data_urls

    def generate_questions_with_gemini(self, num_questions: int = 60) -> List[Dict[str, Any]]:
        """Generate realistic questions using Gemini API."""
        print(f"\n🤖 Generating {num_questions} questions with Gemini...")

        prompt = f"""Generate {num_questions} realistic computer science exam questions in JSON format.
For each question, include:
- question: The question text
- correct_answer: The correct answer
- course: One of [CSC101, CSC102, CSC201, CSC301, CSC401, CSC473]
- topic: Related to the course (e.g., "Data Structures", "Algorithms", "Object-Oriented Programming", "Web Development", "Databases")
- difficulty: One of [easy, medium, hard]

Make the questions educational, clear, and appropriate for the courses listed.
Ensure good variety in topics and difficulty levels.

Return ONLY valid JSON array, no other text. Example format:
[
  {{
    "question": "What is the time complexity of binary search?",
    "correct_answer": "O(log n)",
    "course": "CSC201",
    "topic": "Algorithms",
    "difficulty": "easy"
  }},
  ...
]"""

        try:
            model = genai.GenerativeModel('gemini-2.5-flash-lite')
            response = model.generate_content(prompt)
            
            # Parse the JSON response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            response_text = response_text.strip()

            questions = json.loads(response_text)
            
            if not isinstance(questions, list):
                questions = [questions]

            # Validate questions
            valid_questions = []
            required_fields = ['question', 'correct_answer', 'course', 'topic', 'difficulty']
            
            for q in questions:
                if all(field in q for field in required_fields):
                    # Validate difficulty
                    if q['difficulty'] not in ['easy', 'medium', 'hard']:
                        q['difficulty'] = random.choice(['easy', 'medium', 'hard'])
                    valid_questions.append(q)

            print(f"✓ Generated {len(valid_questions)} valid questions")
            self.questions = valid_questions
            return valid_questions

        except json.JSONDecodeError as e:
            print(f"✗ Error parsing Gemini response as JSON: {str(e)}")
            return []
        except Exception as e:
            print(f"✗ Error generating questions with Gemini: {str(e)}")
            return []

    def submit_all_questions(self) -> int:
        """Submit all generated questions via random user accounts."""
        if not self.questions:
            print("✗ No questions to submit")
            return 0

        if not self.users:
            print("✗ No registered users to submit questions")
            return 0

        print(f"\n📤 Submitting {len(self.questions)} questions via random users...")
        submitted = 0

        for i, question in enumerate(self.questions, 1):
            # Select random user
            user = random.choice(self.users)

            success = self.submit_question(
                question=question['question'],
                correct_answer=question['correct_answer'],
                course=question['course'],
                topic=question['topic'],
                difficulty=question['difficulty'],
                user_id=user['id'],
                user_name=user['name'],
                user_email=user['email']
            )

            if success:
                submitted += 1
                print(f"  [{i}/{len(self.questions)}] ✓ Submitted")
            else:
                print(f"  [{i}/{len(self.questions)}] ✗ Failed")

        print(f"\n✓ Successfully submitted {submitted}/{len(self.questions)} questions")
        return submitted


def generate_random_users(count: int = 10) -> List[Dict[str, str]]:
    """Generate random user data."""
    first_names = [
        'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
        'Iris', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul',
        'Quinn', 'Rachel', 'Samuel', 'Tina', 'Ulysses', 'Violet', 'William', 'Xander',
        'Yara', 'Zachary', 'Aaron', 'Bella', 'Chloe', 'David', 'Emma', 'Felix',
        'Georgia', 'Hannah', 'Isaac', 'Julia', 'Kevin', 'Laura', 'Mason', 'Natalie',
        'Oliver', 'Piper', 'Quinton', 'Rosa', 'Sophie', 'Thomas', 'Uma', 'Victor',
        'Wendy', 'Xavier', 'Yasmine', 'Zoe', 'Adrian', 'Bethany', 'Casey', 'Derek',
        'Elaine', 'Fiona', 'Gavin', 'Holly', 'Ivy', 'Jeremy', 'Kayla', 'Lucas'
    ]
    
    last_names = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
        'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
        'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Young',
        'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Peterson', 'Phillips', 'Campbell',
        'Parker', 'Evans', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales',
        'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
        'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Moreno', 'Kennedy'
    ]
    
    domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'test.com',
               'protonmail.com', 'icloud.com', 'aol.com', 'hotmail.com', 'mail.com']

    users = []
    used_emails = set()

    for i in range(count):
        first = random.choice(first_names)
        last = random.choice(last_names)
        name = f"{first} {last}"
        
        # Generate unique email
        email_base = f"{first.lower()}.{last.lower()}"
        domain = random.choice(domains)
        email = f"{email_base}{i}@{domain}"
        
        while email in used_emails:
            email = f"{email_base}{random.randint(100, 999)}@{domain}"
        
        used_emails.add(email)
        username = f"{email_base}_{i}"

        users.append({
            'username': username,
            'email': email,
            'name': name
        })

    return users


def main():
    parser = argparse.ArgumentParser(
        description='Generate test data and submit questions to NoteSmith API'
    )
    parser.add_argument(
        '--pfp-dir',
        type=str,
        help='Directory containing profile picture icons'
    )
    parser.add_argument(
        '--num-users',
        type=int,
        default=10,
        help='Number of random users to create (default: 10)'
    )
    parser.add_argument(
        '--num-questions',
        type=int,
        default=60,
        help='Number of questions to generate (default: 60)'
    )
    parser.add_argument(
        '--api-url',
        type=str,
        default=API_BASE_URL,
        help=f'API base URL (default: {API_BASE_URL})'
    )

    args = parser.parse_args()

    print("=" * 60)
    print("NoteSmith Test Data Injector")
    print("=" * 60)

    # Initialize injector
    injector = NoteSmithDataInjector(base_url=args.api_url)

    # Load profile pictures
    pfp_urls = []
    if args.pfp_dir:
        pfp_urls = injector.load_pfp_icons(args.pfp_dir)
        print(f"✓ Loaded {len(pfp_urls)} profile pictures\n")
    else:
        print("⚠ No PFP directory provided. Users will be created without profile pictures.\n")

    # Generate random users
    print(f"👥 Creating {args.num_users} random users...")
    random_users = generate_random_users(args.num_users)

    # Register users
    for user_data in random_users:
        pfp = random.choice(pfp_urls) if pfp_urls else None
        injector.register_user(
            username=user_data['username'],
            email=user_data['email'],
            name=user_data['name'],
            profile_picture=pfp
        )

    if not injector.users:
        print("✗ No users were registered. Exiting.")
        sys.exit(1)

    # Generate questions with Gemini
    injector.generate_questions_with_gemini(args.num_questions)

    if not injector.questions:
        print("✗ No questions were generated. Exiting.")
        sys.exit(1)

    # Submit questions
    submitted = injector.submit_all_questions()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Users registered: {len(injector.users)}")
    print(f"Questions generated: {len(injector.questions)}")
    print(f"Questions submitted: {submitted}")
    print("=" * 60 + "\n")


if __name__ == '__main__':
    main()
