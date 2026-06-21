# ARIA – AI Mock Interview Platform

ARIA is a full-stack mock interview platform that helps users prepare for technical and behavioral interviews through AI-driven conversations. Users can upload their resume, practice interviews tailored to their background, receive detailed feedback, track progress over time, and generate personalized study plans.

## Live Demo

**Web App:** https://your-netlify-url.netlify.app

---

## Features

### Authentication

* Secure signup and login using JWT authentication
* Protected routes and session management

### Resume-Based Interviews

* Upload resumes in PDF, DOCX, or TXT format
* Extract skills, projects, education, and experience
* Generate interview questions based on uploaded resume content

### Interview Modes

* HR Interviews
* Data Structures & Algorithms
* Backend Development
* Frontend Development
* System Design
* AI/ML
* Behavioral Interviews

### Adaptive Questioning

* Questions adjust according to previous responses
* Context-aware follow-up questions
* Multi-turn interview conversations

### Voice & Text Support

* Type answers directly
* Speak answers using browser speech recognition
* Live transcription during interviews

### Performance Evaluation

* Detailed feedback after each interview
* Scores across multiple categories
* Per-question analysis and suggestions

### Analytics Dashboard

* Track interview history
* Monitor score trends
* Identify strengths and weak areas
* View performance across different interview categories

### Personalized Study Plans

* Automatically generated learning roadmap
* Topic recommendations based on interview performance
* Suggested practice questions and resources

---

## Tech Stack

### Frontend

* React 19
* React Router
* Tailwind CSS
* shadcn/ui
* Framer Motion
* Axios
* Recharts

### Backend

* FastAPI
* Uvicorn
* Pydantic
* Motor (Async MongoDB Driver)

### Database

* MongoDB Atlas

### Authentication

* JWT
* bcrypt

### AI Services

* Gemini 3 Flash
* OpenAI-Compatible API Integration

### Resume Processing

* pypdf
* python-docx

---

## Project Structure

```text
.
├── backend/
│   ├── server.py
│   ├── ai_service.py
│   ├── auth.py
│   ├── models.py
│   ├── resume_parser.py
│   ├── requirements.txt
│   └── tests/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── App.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── craco.config.js
│
└── README.md
```

---

## Local Setup

### Prerequisites

* Python 3.11+
* Node.js 18+
* Yarn
* MongoDB Atlas Account
* Gemini API Key

---

### Backend Setup

```bash
cd backend

python -m venv .venv

# Linux / macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file inside the backend directory:

```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=mock-interview-db

JWT_SECRET=your_jwt_secret

LLM_API_KEY=your_api_key
LLM_BASE_URL=https://generativelanguage.googleapis.com
LLM_MODEL=gemini-3-flash
```

Start the backend server:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend runs on:

```text
http://localhost:8001
```

---

### Frontend Setup

```bash
cd frontend

yarn install
```

Create a `.env` file:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Run the frontend:

```bash
yarn start
```

Frontend runs on:

```text
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint                      | Description       |
| ------ | ----------------------------- | ----------------- |
| GET    | /api/                         | Health Check      |
| POST   | /api/auth/register            | Register User     |
| POST   | /api/auth/login               | Login User        |
| GET    | /api/auth/me                  | Current User      |
| POST   | /api/resume/upload            | Upload Resume     |
| GET    | /api/resume/latest            | Latest Resume     |
| POST   | /api/interviews               | Create Interview  |
| GET    | /api/interviews               | List Interviews   |
| GET    | /api/interviews/{id}          | Interview Details |
| POST   | /api/interviews/{id}/answer   | Submit Answer     |
| GET    | /api/feedback/by-session/{id} | Feedback Report   |
| GET    | /api/study-plans/latest       | Latest Study Plan |
| GET    | /api/analytics/overview       | Analytics Data    |

---

## Deployment

### Frontend

* Netlify

### Backend

* Render

### Database

* MongoDB Atlas

---

### Dashboard

![alt text](image.png)


## Key Highlights

* Resume-aware interview generation
* Voice and text interview modes
* Adaptive follow-up questioning
* Automated interview evaluation
* Personalized study plans
* Performance analytics and progress tracking
* Secure authentication and cloud deployment

---

## Future Improvements

* Coding interview environment
* Google and GitHub OAuth
* PDF report exports
* Webcam-based confidence analysis
* Real-time AI response streaming

---


## Live Application

**https://aimockinterviewapp.netlify.app/**
