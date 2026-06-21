"""llm service wrapper using google gemini api."""

import os
import json
import re
import logging
from typing import List, Dict, Any

import google.generativeai as genai

logger = logging.getLogger(__name__)


def _model():
    """create gemini model from environment variables."""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
    model_name = os.environ.get("GEMINI_MODEL") or os.environ.get("LLM_MODEL", "gemini-1.5-flash")

    if not api_key:
        raise RuntimeError("gemini api key is missing")

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


async def _chat(messages: List[Dict[str, str]], system: str = None) -> str:
    """send prompt to gemini and return response text."""

    prompt_parts = []

    if system:
        prompt_parts.append(f"system instructions:\n{system}")

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        prompt_parts.append(f"{role}:\n{content}")

    prompt = "\n\n".join(prompt_parts)

    try:
        response = await _model().generate_content_async(prompt)
        return response.text or ""
    except Exception as exc:
        logger.exception("gemini request failed")
        raise exc


def _extract_json(text: str) -> Any:
    """extract the first json object or array from raw model output."""
    if not text:
        return None

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except Exception:
            pass

    try:
        return json.loads(text)
    except Exception:
        pass

    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        end = text.rfind(closer)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                continue

    return None


async def parse_resume(text: str) -> Dict[str, Any]:
    """convert raw resume text into structured resume data."""

    system = (
        "You are an expert resume parser. Extract structured data from resumes. "
        "Always respond with only a valid JSON object and no extra text."
    )

    prompt = f"""Extract the following fields from this resume text. Return only JSON with this exact shape:
{{
  "skills": [string],
  "technologies": [string],
  "projects": [{{"name": string, "description": string, "tech": [string]}}],
  "education": [{{"degree": string, "institution": string, "year": string}}],
  "experience": [{{"role": string, "company": string, "duration": string, "highlights": [string]}}],
  "summary": string
}}

Resume text:
\"\"\"{text[:8000]}\"\"\"
"""

    resp = await _chat([{"role": "user", "content": prompt}], system=system)
    data = _extract_json(resp) or {}

    return {
        "skills": data.get("skills", []) or [],
        "technologies": data.get("technologies", []) or [],
        "projects": data.get("projects", []) or [],
        "education": data.get("education", []) or [],
        "experience": data.get("experience", []) or [],
        "summary": data.get("summary", "") or "",
    }


def _interview_system(config: Dict[str, Any], resume_summary: str) -> str:
    """build the interviewer instructions."""

    return f"""You are a professional interviewer named ARIA conducting a {config['difficulty']} level {config['interview_type']} interview for a candidate targeting {config.get('target_company', 'top tech companies')}.

Interview rules:
- Ask one question at a time.
- Keep questions concise and realistic.
- Build on previous answers when useful.
- Adapt difficulty based on response quality.
- Sound like a senior human interviewer.
- Do not use emojis, apologies, or meta-commentary.
- Vary question types based on the interview category.

Candidate background:
{resume_summary or 'No resume provided. Ask general questions.'}

The interview will have around {config.get('total_questions', 6)} main questions.
When generating a question, output only the question text."""


async def generate_first_question(session_id: str, config: Dict[str, Any], resume_summary: str) -> str:
    """generate first interview question."""

    system = _interview_system(config, resume_summary)
    user = "Begin the interview. Greet briefly in one sentence, then ask your first question. Keep it short."

    resp = await _chat([{"role": "user", "content": user}], system=system)
    return resp.strip()


async def generate_next_question(
    session_id: str,
    config: Dict[str, Any],
    resume_summary: str,
    history: List[Dict[str, str]],
    last_answer: str,
    question_index: int,
    total: int,
) -> str:
    """generate next interview question."""

    system = _interview_system(config, resume_summary)

    convo = ""
    for h in history:
        convo += f"interviewer: {h.get('question', '')}\n"
        convo += f"candidate: {h.get('answer', '')}\n"

    convo += f"candidate just answered: {last_answer}\n"

    if question_index >= total - 1:
        user = (
            f"conversation so far:\n{convo}\n"
            "This is the final question. Ask one strong closing question that probes depth. "
            "Output only the question."
        )
    else:
        user = (
            f"conversation so far:\n{convo}\n"
            f"Ask question {question_index + 1} of {total}. "
            "Use a follow-up if appropriate, otherwise move to a useful new topic. "
            "Output only the question."
        )

    resp = await _chat([{"role": "user", "content": user}], system=system)
    return resp.strip()


async def evaluate_interview(
    config: Dict[str, Any],
    resume_summary: str,
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """score a completed interview and return feedback."""

    system = (
        "You are a senior interview evaluator. Provide fair and actionable evaluation. "
        "Always respond with only valid JSON."
    )

    transcript = "\n\n".join(
        [
            f"Q{i + 1}: {h.get('question', '')}\nA{i + 1}: {h.get('answer', '') or '[no answer]'}"
            for i, h in enumerate(history)
        ]
    )

    prompt = f"""Evaluate this {config['difficulty']} {config['interview_type']} interview.

Candidate resume summary:
{resume_summary or 'N/A'}

Transcript:
{transcript}

Return only JSON with this exact shape:
{{
  "technical_score": int,
  "communication_score": int,
  "confidence_score": int,
  "problem_solving_score": int,
  "overall_score": int,
  "strengths": [string],
  "weaknesses": [string],
  "improvement_suggestions": [string],
  "topic_scores": [{{"topic": string, "score": int}}],
  "summary": string,
  "per_question": [{{"question": string, "feedback": string, "score": int}}]
}}

All scores must be between 0 and 100."""

    resp = await _chat([{"role": "user", "content": prompt}], system=system)
    data = _extract_json(resp) or {}

    return {
        "technical_score": int(data.get("technical_score", 50)),
        "communication_score": int(data.get("communication_score", 50)),
        "confidence_score": int(data.get("confidence_score", 50)),
        "problem_solving_score": int(data.get("problem_solving_score", 50)),
        "overall_score": int(data.get("overall_score", 50)),
        "strengths": data.get("strengths", []) or [],
        "weaknesses": data.get("weaknesses", []) or [],
        "improvement_suggestions": data.get("improvement_suggestions", []) or [],
        "topic_scores": data.get("topic_scores", []) or [],
        "summary": data.get("summary", "") or "",
        "per_question": data.get("per_question", []) or [],
    }


async def generate_study_plan(
    config: Dict[str, Any],
    feedback: Dict[str, Any],
    resume_summary: str,
) -> Dict[str, Any]:
    """create a personalized four-week study plan."""

    system = (
        "You are a senior career coach building learning roadmaps for engineers. "
        "Always respond with only valid JSON."
    )

    weak = ", ".join(feedback.get("weaknesses", []))
    suggestions = " | ".join(feedback.get("improvement_suggestions", []))

    prompt = f"""Build a personalized 4-week study plan.

Interview type: {config.get('interview_type')}
Difficulty target: {config.get('difficulty')}
Target company: {config.get('target_company', 'General')}
Candidate weaknesses: {weak}
Improvement suggestions: {suggestions}
Resume summary: {resume_summary[:1500]}

Return only JSON:
{{
  "roadmap": [{{"week": int, "focus": string, "topics": [string], "deliverables": [string]}}],
  "dsa_topics": [string],
  "system_design_topics": [string],
  "recommended_questions": [string],
  "projects": [string],
  "resources": [{{"name": string, "type": string, "url": string}}]
}}"""

    resp = await _chat([{"role": "user", "content": prompt}], system=system)
    data = _extract_json(resp) or {}

    return {
        "roadmap": data.get("roadmap", []) or [],
        "dsa_topics": data.get("dsa_topics", []) or [],
        "system_design_topics": data.get("system_design_topics", []) or [],
        "recommended_questions": data.get("recommended_questions", []) or [],
        "projects": data.get("projects", []) or [],
        "resources": data.get("resources", []) or [],
    }