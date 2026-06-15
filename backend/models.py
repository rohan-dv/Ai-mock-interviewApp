"""pydantic models used for request bodies, responses, and database records."""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def _uid() -> str:
    """create a unique id for users, resumes, sessions, feedback, and plans."""

    return str(uuid.uuid4())


def _now_iso() -> str:
    """return the current utc time as an iso formatted string."""

    return datetime.now(timezone.utc).isoformat()


# auth models
class UserCreate(BaseModel):
    # data required when a new user registers
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class UserLogin(BaseModel):
    # data required when an existing user logs in
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    # public user data returned to the frontend, without password hash
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    created_at: str


class TokenResponse(BaseModel):
    # response sent after login or registration
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# resume models
class ResumeData(BaseModel):
    # structured resume information extracted by the llm parser
    skills: List[str] = []
    technologies: List[str] = []
    projects: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []
    summary: str = ""


class ResumeRecord(BaseModel):
    # complete resume record stored in mongodb
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    user_id: str
    filename: str
    raw_text: str
    parsed: ResumeData
    created_at: str = Field(default_factory=_now_iso)


# interview models
class InterviewConfig(BaseModel):
    # settings chosen by the user before starting an interview
    interview_type: str
    difficulty: str
    duration_minutes: int = 20
    target_company: Optional[str] = "General"
    mode: str = "text"
    total_questions: int = 6


class InterviewCreate(BaseModel):
    # request body for creating a new interview session
    config: InterviewConfig


class QAItem(BaseModel):
    # one question and its corresponding answer inside an interview
    question: str
    answer: Optional[str] = ""
    asked_at: str = Field(default_factory=_now_iso)
    answered_at: Optional[str] = None


class InterviewSession(BaseModel):
    # interview session stored in the database
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    user_id: str
    config: InterviewConfig
    questions: List[QAItem] = []
    current_index: int = 0
    status: str = "in_progress"
    feedback_status: str = "pending"
    started_at: str = Field(default_factory=_now_iso)
    completed_at: Optional[str] = None
    feedback_id: Optional[str] = None


class AnswerSubmit(BaseModel):
    # request body used when the candidate submits an answer
    answer: str


# feedback models
class TopicScore(BaseModel):
    # score for one interview topic, such as dsa, system design, or communication
    topic: str
    score: int


class FeedbackReport(BaseModel):
    # full feedback report generated after an interview ends
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    session_id: str
    user_id: str
    technical_score: int
    communication_score: int
    confidence_score: int
    problem_solving_score: int
    overall_score: int
    strengths: List[str]
    weaknesses: List[str]
    improvement_suggestions: List[str]
    topic_scores: List[TopicScore]
    summary: str
    per_question: List[Dict[str, Any]] = []
    created_at: str = Field(default_factory=_now_iso)


# study plan models
class StudyPlan(BaseModel):
    # personalized plan generated from the interview feedback
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uid)
    user_id: str
    session_id: Optional[str] = None
    roadmap: List[Dict[str, Any]]
    dsa_topics: List[str]
    system_design_topics: List[str]
    recommended_questions: List[str]
    projects: List[str]
    resources: List[Dict[str, str]]
    created_at: str = Field(default_factory=_now_iso)
