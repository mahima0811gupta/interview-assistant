# 🤖 AI-Powered Interview Assistant

An interactive, resume-aware AI mock interview web app that simulates interview questions, lets you respond via speech and webcam, and provides personalized AI feedback with scoring, sentiment, and local video recording — all in your browser.

---

## 🚀 Features

- 📄 **Resume Upload**: Upload `.txt` resume to personalize questions
- 🧠 **AI Question Generation**: Questions generated via LLaMA3-70B model (Groq)
- 🧑‍💼 **Round Selection**: Choose between Technical, HR, and Behavioral rounds
- 🎙️ **Speech Input**: Answer questions using your voice
- 📷 **Webcam Monitoring**: Real-time webcam during answer
- 🎬 **Local Video Recording**: Review your answer without storing it
- 🗣️ **Text-to-Speech Feedback**: Hear your evaluation aloud
- 🧾 **Structured Feedback**: Strengths, Weaknesses, Suggestions, Score
- 🌗 **Dark/Light Mode Toggle**
- 💬 **Toast Notifications & UX Enhancements**

---

## 🧠 Tech Stack

| Layer      | Tech                         |
|------------|------------------------------|
| Frontend   | HTML, CSS, JavaScript        |
| Backend    | FastAPI, Python              |
| AI Model   | LLaMA3-70B via Groq API      |
| Analysis   | TextBlob (Sentiment), Scikit-learn |
| Audio/Video| Web Speech API, MediaRecorder, getUserMedia |
| Deployment | Render.com (recommended)     |

---

## 🗂️ Project Structure

```

project-root/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── main.py
│   └── requirements.txt
│
└── README.md

```

---

Live Link-https://www.youtube.com/watch?v=LpiYCn9isEw
## ⚙️ Backend Installation

**Requirements (in `backend/requirements.txt`):**

```

fastapi
uvicorn\[standard]
scikit-learn
textblob
python-multipart
requests
PyMuPDF

````

**Install dependencies:**

```bash
cd backend
pip install -r backend/requirements.txt
````

**Run backend locally:**

```bash
uvicorn backend.main:app --reload
```

It will run on: `http://127.0.0.1:8000`

---

## 💻 Frontend Setup

No build tool needed. Just open:

```bash
frontend/index.html
```

> Works best in **Google Chrome** (due to Web Speech API support).

---


#### Backend (FastAPI):

* Create new **Web Service**
* Connect your GitHub repo
* Fill settings:

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| Build Command    | `pip install -r requirements.txt`              |
| Start Command    | `uvicorn main:app --host 0.0.0.0 --port 10000` |
| Root Directory   | `backend` (if files are under `backend/`)      |
| Environment Vars | `GROQ_API_KEY=your_actual_key_here`            |

#### Frontend:

* Create new **Static Site**
* Set root directory to `frontend/`

---

## 🧪 How to Use

1. Upload your `.txt` resume
2. Select interview round (Technical, HR, Behavioral)
3. Click **Start Mock Interview**
4. AI generates questions one by one
5. Use **Speak** button to answer via voice
6. Webcam and mic are activated per question
7. Click **Evaluate** to get AI feedback
8. Optionally **preview your recording** (no storage)
9. Toggle **Dark/Light Mode** as needed

---

## 📝 Sample `.env` (if using locally)

```bash
GROQ_API_KEY=your_groq_key_here
```

Or pass it in code where needed.

---

## 📌 Notes

* Resume **must** be in `.txt` format
* Speech input uses browser's native Web Speech API
* Video is only recorded and previewed in-memory — **not saved**
* Works best on **Chrome** (Web Speech API compatibility)
* Webcam auto starts/stops with each question
* Feedback includes **Score**, **Strengths**, **Weaknesses**, and **Suggestions**

---

## 👩‍💻 Author

Built with ❤️ by \[Mahima Gupta]

> Questions or suggestions? Open an issue or reach out!

---





MIT License – free to use and modify.

```

-
