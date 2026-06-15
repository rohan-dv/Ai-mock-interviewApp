"""main fastapi server for the ai mock interview platform.

this file connects authentication, resume upload, interview sessions,
feedback generation, study plans, and analytics into one api.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from dotenv import load_dotenv
import os
from pathlib import Path

# find the backend folder and load environment variables from .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from typing import List, Optional, Dict

from models import (
    UserCreate, UserLogin, UserPublic, TokenResponse,
    ResumeData, ResumeRecord,
    InterviewCreate, InterviewSession, QAItem, AnswerSubmit,
    FeedbackReport, TopicScore,
    StudyPlan,
    _uid, _now_iso,
)
from auth import hash_password, verify_password, create_token, get_current_user_id
from resume_parser import extract_resume_text
from ai_service import (
    parse_resume, generate_first_question, generate_next_question,
    evaluate_interview, generate_study_plan,
)

# connect to mongodb using values from the environment
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# create the main fastapi app and an api router with /api prefix
app = FastAPI(title="AI Mock Interview Platform")
api = APIRouter(prefix="/api")


# health routes
@api.get("/")
async def root():
    # simple endpoint to check whether the backend is running
    return {"message": "AI Mock Interview API", "status": "ok"}


# auth routes
@api.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    # check whether this email is already registered
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # create a new user document with hashed password
    user_id = _uid()
    doc = {
        "id": user_id,
        "email": body.email.lower(),
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "created_at": _now_iso(),
    }

    # save the user and immediately return a login token
    await db.users.insert_one(doc)
    token = create_token(user_id, doc["email"])
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user_id, email=doc["email"], name=doc["name"], created_at=doc["created_at"]),
    )


@api.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    # find user by email and hide mongodb internal _id field
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})

    # reject login if user does not exist or password is wrong
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # create a fresh jwt token after successful login
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"]),
    )


@api.get("/auth/me", response_model=UserPublic)
async def me(user_id: str = Depends(get_current_user_id)):
    # return the currently logged-in user's public profile
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic(**user)


# resume routes
@api.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    # read uploaded resume file into memory
    content = await file.read()

    # limit file size so users cannot overload the server
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # extract text depending on whether file is pdf, docx, or txt
    try:
        text, ext = extract_resume_text(file.filename or "resume", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # reject files where text extraction failed or produced almost nothing
    if not text or len(text.strip()) < 30:
        raise HTTPException(status_code=400, detail="Could not extract text from resume")

    # ask the llm to convert resume text into structured resume data
    parsed = await parse_resume(text)

    # create a database record for this resume
    record = ResumeRecord(
        user_id=user_id,
        filename=file.filename or f"resume.{ext}",
        raw_text=text[:20000],
        parsed=ResumeData(**parsed),
    )
    doc = record.model_dump()
    await db.resumes.insert_one(doc)

    # save this resume id on the user as their latest resume
    await db.users.update_one({"id": user_id}, {"$set": {"latest_resume_id": record.id}})
    return record


@api.get("/resume/latest")
async def latest_resume(user_id: str = Depends(get_current_user_id)):
    # fetch the newest uploaded resume for this user
    resume = await db.resumes.find_one(
        {"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)]
    )
    return resume


# interview helper
async def _get_latest_resume_summary(user_id: str) -> str:
    """build a short resume summary used as context for interview questions."""

    # get the latest resume for the current user
    resume = await db.resumes.find_one({"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)])
    if not resume:
        return ""

    # parsed resume data is stored by the resume parser
    parsed = resume.get("parsed", {})
    parts = []

    # include summary, skills, technologies, and top experiences if available
    if parsed.get("summary"):
        parts.append(parsed["summary"])
    if parsed.get("skills"):
        parts.append("Skills: " + ", ".join(parsed["skills"][:20]))
    if parsed.get("technologies"):
        parts.append("Tech: " + ", ".join(parsed["technologies"][:15]))

    # keep only a few experience items so the prompt stays short
    exps = parsed.get("experience", [])[:3]
    if exps:
        parts.append("Experience: " + " | ".join(
            f"{e.get('role','')} @ {e.get('company','')}" for e in exps
        ))

    return "\n".join(parts)


# interview routes
@api.post("/interviews", response_model=InterviewSession)
async def create_interview(
    body: InterviewCreate,
    user_id: str = Depends(get_current_user_id),
):
    # collect resume context so first question can be personalized
    summary = await _get_latest_resume_summary(user_id)

    # create a new empty interview session
    session = InterviewSession(user_id=user_id, config=body.config)

    # generate the first question from the llm and store it in the session
    first_q = await generate_first_question(session.id, body.config.model_dump(), summary)
    session.questions.append(QAItem(question=first_q))

    # save session in mongodb
    doc = session.model_dump()
    await db.interviews.insert_one(doc)
    return session


@api.get("/interviews/{session_id}", response_model=InterviewSession)
async def get_interview(session_id: str, user_id: str = Depends(get_current_user_id)):
    # fetch one interview session that belongs to the logged-in user
    doc = await db.interviews.find_one({"id": session_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    return InterviewSession(**doc)


@api.post("/interviews/{session_id}/answer", response_model=InterviewSession)
async def submit_answer(
    session_id: str,
    body: AnswerSubmit,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    # load the current interview session
    doc = await db.interviews.find_one({"id": session_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc["status"] == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")

    # convert database dict back into a pydantic model
    session = InterviewSession(**doc)
    idx = session.current_index

    # this protects against broken state where no current question exists
    if idx >= len(session.questions):
        raise HTTPException(status_code=400, detail="No active question")

    # save answer for the current question
    session.questions[idx].answer = body.answer
    session.questions[idx].answered_at = _now_iso()

    total = session.config.total_questions
    next_index = idx + 1

    if next_index >= total:
        # if all questions are answered, mark interview as completed
        session.status = "completed"
        session.feedback_status = "generating"
        session.completed_at = _now_iso()

        # save completed state before starting background generation
        await db.interviews.replace_one({"id": session.id}, session.model_dump())

        # generate feedback and study plan in the background so api response stays fast
        background_tasks.add_task(_generate_feedback_and_plan, session.id, user_id)
        return session
    else:
        # generate the next question using resume context and previous answers
        summary = await _get_latest_resume_summary(user_id)
        history = [{"question": q.question, "answer": q.answer or ""} for q in session.questions[:next_index]]
        next_q = await generate_next_question(
            session.id, session.config.model_dump(), summary, history,
            body.answer, next_index, total,
        )

        # add next question and move current index forward
        session.questions.append(QAItem(question=next_q))
        session.current_index = next_index

    # save updated interview after either answer update or next question generation
    await db.interviews.replace_one({"id": session.id}, session.model_dump())
    return session


async def _generate_feedback_and_plan(session_id: str, user_id: str):
    """background task that creates feedback and a study plan after an interview."""

    try:
        # load the completed session again inside the background task
        doc = await db.interviews.find_one({"id": session_id, "user_id": user_id}, {"_id": 0})
        if not doc:
            return

        session = InterviewSession(**doc)
        summary = await _get_latest_resume_summary(user_id)

        # convert stored questions into the format expected by ai_service
        history = [{"question": q.question, "answer": q.answer or ""} for q in session.questions]

        # ask the llm to evaluate the whole interview
        eval_data = await evaluate_interview(session.config.model_dump(), summary, history)

        # create and store feedback report
        feedback = FeedbackReport(
            session_id=session.id,
            user_id=user_id,
            technical_score=eval_data["technical_score"],
            communication_score=eval_data["communication_score"],
            confidence_score=eval_data["confidence_score"],
            problem_solving_score=eval_data["problem_solving_score"],
            overall_score=eval_data["overall_score"],
            strengths=eval_data["strengths"],
            weaknesses=eval_data["weaknesses"],
            improvement_suggestions=eval_data["improvement_suggestions"],
            topic_scores=[TopicScore(**t) for t in eval_data["topic_scores"] if isinstance(t, dict) and "topic" in t and "score" in t],
            summary=eval_data["summary"],
            per_question=eval_data["per_question"],
        )
        await db.feedback.insert_one(feedback.model_dump())

        # generate a personalized study plan using the feedback
        plan_data = await generate_study_plan(session.config.model_dump(), eval_data, summary)
        plan = StudyPlan(
            user_id=user_id,
            session_id=session.id,
            roadmap=plan_data["roadmap"],
            dsa_topics=plan_data["dsa_topics"],
            system_design_topics=plan_data["system_design_topics"],
            recommended_questions=plan_data["recommended_questions"],
            projects=plan_data["projects"],
            resources=plan_data["resources"],
        )
        await db.study_plans.insert_one(plan.model_dump())

        # mark feedback as ready on the interview session
        await db.interviews.update_one(
            {"id": session.id},
            {"$set": {"feedback_id": feedback.id, "feedback_status": "ready"}},
        )
    except Exception as e:
        # log the full error and mark the session so frontend can show a failure state
        logger.exception("Feedback generation failed for session %s: %s", session_id, e)
        await db.interviews.update_one(
            {"id": session_id},
            {"$set": {"feedback_status": "error"}},
        )


@api.get("/interviews", response_model=List[InterviewSession])
async def list_interviews(user_id: str = Depends(get_current_user_id)):
    # return recent interview sessions for the logged-in user
    cursor = db.interviews.find({"user_id": user_id}, {"_id": 0}).sort("started_at", -1).limit(50)
    items = await cursor.to_list(50)
    return [InterviewSession(**i) for i in items]


# feedback routes
@api.get("/feedback/{feedback_id}", response_model=FeedbackReport)
async def get_feedback(feedback_id: str, user_id: str = Depends(get_current_user_id)):
    # fetch feedback by feedback id
    doc = await db.feedback.find_one({"id": feedback_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return FeedbackReport(**doc)


@api.get("/feedback/by-session/{session_id}", response_model=FeedbackReport)
async def get_feedback_by_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    # fetch feedback using the interview session id
    doc = await db.feedback.find_one({"session_id": session_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return FeedbackReport(**doc)


# study plan routes
@api.get("/study-plans/by-session/{session_id}", response_model=StudyPlan)
async def get_study_plan_by_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    # fetch the study plan generated for a specific interview session
    doc = await db.study_plans.find_one({"session_id": session_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Study plan not found")
    return StudyPlan(**doc)


@api.get("/study-plans/latest", response_model=Optional[StudyPlan])
async def latest_study_plan(user_id: str = Depends(get_current_user_id)):
    # fetch the newest study plan for this user
    doc = await db.study_plans.find_one({"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)])
    if not doc:
        return None
    return StudyPlan(**doc)


# analytics routes
@api.get("/analytics/overview")
async def analytics_overview(user_id: str = Depends(get_current_user_id)):
    # collect feedback and interview data for dashboard analytics
    feedbacks = await db.feedback.find({"user_id": user_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    interviews = await db.interviews.find({"user_id": user_id}, {"_id": 0}).to_list(500)

    # return empty analytics if the user has not completed any interview yet
    if not feedbacks:
        return {
            "total_interviews": len(interviews),
            "completed_interviews": 0,
            "average_overall": 0,
            "average_technical": 0,
            "average_communication": 0,
            "average_confidence": 0,
            "score_trend": [],
            "topic_mastery": [],
            "weak_topics": [],
            "by_type": [],
            "recent": [],
        }

    # helper to calculate rounded average for one score field
    n = len(feedbacks)

    def avg(k):
        return round(sum(f.get(k, 0) for f in feedbacks) / n)

    # build trend data for charts on the frontend
    trend = [
        {
            "date": f["created_at"][:10],
            "overall": f["overall_score"],
            "technical": f["technical_score"],
            "communication": f["communication_score"],
            "confidence": f["confidence_score"],
        }
        for f in feedbacks
    ]

    # aggregate average score for each topic across all feedback reports
    topic_agg: Dict[str, List[int]] = {}
    for f in feedbacks:
        for t in f.get("topic_scores", []):
            topic = t.get("topic")
            score = t.get("score")
            if topic and isinstance(score, (int, float)):
                topic_agg.setdefault(topic, []).append(int(score))

    # convert topic aggregation into a frontend-friendly list
    topic_mastery = [
        {"topic": k, "score": round(sum(v) / len(v)), "count": len(v)}
        for k, v in topic_agg.items()
    ]
    topic_mastery.sort(key=lambda x: x["score"], reverse=True)

    # lowest scored topics are shown as weak topics
    weak_topics = sorted(topic_mastery, key=lambda x: x["score"])[:5]

    # map interview id to interview details so feedback can be grouped by interview type
    type_agg: Dict[str, List[int]] = {}
    interview_map = {i["id"]: i for i in interviews}
    for f in feedbacks:
        i = interview_map.get(f["session_id"])
        if i:
            t = i["config"]["interview_type"]
            type_agg.setdefault(t, []).append(f["overall_score"])

    # calculate average score for each interview type
    by_type = [
        {"type": k, "average": round(sum(v) / len(v)), "count": len(v)}
        for k, v in type_agg.items()
    ]

    # prepare recent completed interviews for dashboard cards
    recent = []
    for f in sorted(feedbacks, key=lambda x: x["created_at"], reverse=True)[:5]:
        i = interview_map.get(f["session_id"], {})
        recent.append({
            "feedback_id": f["id"],
            "session_id": f["session_id"],
            "type": i.get("config", {}).get("interview_type", "Unknown"),
            "difficulty": i.get("config", {}).get("difficulty", ""),
            "overall_score": f["overall_score"],
            "date": f["created_at"],
        })

    # final analytics object returned to the frontend
    return {
        "total_interviews": len(interviews),
        "completed_interviews": n,
        "average_overall": avg("overall_score"),
        "average_technical": avg("technical_score"),
        "average_communication": avg("communication_score"),
        "average_confidence": avg("confidence_score"),
        "score_trend": trend,
        "topic_mastery": topic_mastery,
        "weak_topics": weak_topics,
        "by_type": by_type,
        "recent": recent,
    }


# attach all /api routes to the main app
app.include_router(api)

# allow frontend requests from configured origins
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# configure logging format for backend logs
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    # close mongodb connection when the app shuts down
    client.close()
