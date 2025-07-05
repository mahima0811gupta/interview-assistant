
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from textblob import TextBlob  
from pydantic import BaseModel
import requests
import os
app = FastAPI()

# ✅ CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Config
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama3-70b-8192"  # Or "mixtral-8x7b-32768"



@app.post("/generate_questions")
async def generate_questions(
    file: UploadFile = File(...),
    round_type: str = Form(...)
):
    try:
        content = await file.read()
        resume_text = content.decode(errors="ignore")

        prompt = (
            f"You are an expert interviewer. Based on the resume below, generate 4 {round_type} interview questions. "
            "Number the questions clearly from 1 to 4.\n\n"
            f"Resume:\n{resume_text}\n\n"
            f"{round_type} Round Questions:\n1."
        )

        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": "You are a helpful interview assistant."},
                {"role": "user", "content": prompt}
            ]
        }

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(GROQ_ENDPOINT, json=payload, headers=headers)
        result = response.json()

        if "choices" not in result:
            return {"error": "LLM did not return valid choices."}

        return {"questions": result["choices"][0]["message"]["content"]}

    except Exception as e:
        return {"error": str(e)}





def evaluate_answer(candidate_answer, reference_answer):
    vectorizer = CountVectorizer().fit_transform([candidate_answer, reference_answer])
    vectors = vectorizer.toarray()
    similarity = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
    sentiment = TextBlob(candidate_answer).sentiment.polarity
    return {
        "keyword_score": round(similarity * 100, 2),
        "sentiment_score": round(sentiment, 2)
    }

class AnswerInput(BaseModel):
    question: str
    candidate_answer: str

@app.post("/evaluate_answer")
async def evaluate_answer_api(data: AnswerInput):
    feedback_prompt = f"""
You are a senior technical interviewer.

Evaluate the candidate’s response to the following interview question and provide detailed, constructive feedback.

Question:
{data.question}

Answer:
{data.candidate_answer}

Give your response in the following structured format:

- Score (out of 10):
- Strengths:
- Weaknesses:
- Suggestions for improvement:
"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful and experienced interview evaluator."},
            {"role": "user", "content": feedback_prompt}
        ]
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(GROQ_ENDPOINT, json=payload, headers=headers)
    result = response.json()

    if "choices" not in result:
        return {"error": "LLM did not return feedback."}

    feedback = result["choices"][0]["message"]["content"]
    scores = evaluate_answer(data.candidate_answer, data.question)

    return {
        "feedback": feedback,
        "scores": scores
    }






class FeedbackInput(BaseModel):
    question: str
    candidate_answer: str

@app.post("/generate_feedback")
async def generate_feedback(data: FeedbackInput):
    prompt = f"""
You are a senior technical interviewer.

Evaluate the candidate’s response to the following interview question.

Question:
{data.question}

Answer:
{data.candidate_answer}

Give your feedback in the following format:

**Score (out of 10):**
...

**Strengths:**
...

**Areas to Improve:**
...

**Suggestions for Improvement:**
...
"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful and detail-oriented interview coach."},
            {"role": "user", "content": prompt}
        ]
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(GROQ_ENDPOINT, json=payload, headers=headers)
    result = response.json()

    if "choices" not in result:
        return {"error": "LLM did not return structured feedback."}

    feedback = result["choices"][0]["message"]["content"]
    return {"feedback": feedback}






