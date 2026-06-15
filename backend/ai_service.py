"""llm service wrapper for an openai-compatible chat completions endpoint.

this file keeps all ai-related calls in one place so the rest of the backend
can simply call functions like parse_resume(), generate_next_question(), and
evaluate_interview() without worrying about provider-specific details.

configure using environment variables:
    llm_api_key    - api key for the upstream model provider
    llm_base_url   - base url of any openai-compatible endpoint
    llm_model      - model name or model id to call
"""

import os
import json
import re
import logging
from typing import List, Dict, Any
from openai import AsyncOpenAI

# create a logger for this file so errors can be tracked during debugging
logger = logging.getLogger(__name__)


def _client() -> AsyncOpenAI:
    """create and return a fresh async openai-compatible client."""

    # the key and base url are read from environment variables so secrets are not hardcoded
    return AsyncOpenAI(
        api_key=os.environ.get("LLM_API_KEY", ""),
        base_url=os.environ.get("LLM_BASE_URL") or None,
    )


def _model() -> str:
    """return the model configured for this project."""

    # use env model if provided, otherwise fall back to a default model id
    return os.environ.get("LLM_MODEL", "gemini/gemini-3-flash-preview")


async def _chat(messages: List[Dict[str, str]], system: str = None) -> str:
    """send messages to the llm and return only the assistant text."""

    # this list becomes the final message list sent to the model
    msgs: List[Dict[str, str]] = []

    # system prompt is optional, but useful for setting behavior and output format
    if system:
        msgs.append({"role": "system", "content": system})

    # add the normal conversation messages after the system message
    msgs.extend(messages)

    # make the async model call using the configured model
    resp = await _client().chat.completions.create(model=_model(), messages=msgs)

    # return empty string if the model response has no content
    return resp.choices[0].message.content or ""


def _extract_json(text: str) -> Any:
    """extract the first json object or array from raw llm output."""

    # no text means there is nothing to parse
    if not text:
        return None

    # first try to find json inside markdown fences like ```json ... ```
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except Exception:
            # if fenced json is broken, keep trying other fallback methods
            pass

    # next try to parse the whole response as json
    try:
        return json.loads(text)
    except Exception:
        pass

    # final fallback: try to locate the first object or array inside extra text
    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        end = text.rfind(closer)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                continue

    # return none if every parsing attempt fails
    return None


async def parse_resume(text: str) -> Dict[str, Any]:
    """convert raw resume text into structured resume data."""

    # this system prompt forces the model to behave like a strict parser
    system = (
        "You are an expert resume parser. Extract structured data from resumes. "
        "Always respond with ONLY a valid JSON object, no commentary."
    )

    # the resume is trimmed so extremely large resumes do not overload the model input
    prompt = f"""Extract the following fields from this resume text. Return ONLY JSON with this exact shape:
{{
  "skills": [string],
  "technologies": [string],
  "projects": [{{"name": string, "description": string, "tech": [string]}}],
  "education": [{{"degree": string, "institution": string, "year": string}}],
  "experience": [{{"role": string, "company": string, "duration": string, "highlights": [string]}}],
  "summary": string
}}

RESUME TEXT:
\"\"\"{text[:8000]}\"\"\"
"""

    # call the model and try to parse its response as json
    resp = await _chat([{"role": "user", "content": prompt}], system=system)
    data = _extract_json(resp) or {}

    # return a safe structure even if the model misses some fields
    return {
        "skills": data.get("skills", []) or [],
        "technologies": data.get("technologies", []) or [],
        "projects": data.get("projects", []) or [],
        "education": data.get("education", []) or [],
        "experience": data.get("experience", []) or [],
        "summary": data.get("summary", "") or "",
    }


def _interview_system(config: Dict[str, Any], resume_summary: str) -> str:
    """build the system prompt used by the interviewer model."""

    # this prompt defines interviewer personality, rules, candidate context, and output format
    return f"""You are an elite professional interviewer named ARIA conducting a {config['difficulty']} level {config['interview_type']} interview for a candidate targeting {config.get('target_company', 'top tech companies')}.

INTERVIEW GUIDELINES:
- Ask ONE question at a time. Keep questions concise and realistic.
- Build on the candidate's previous answers with follow-ups when appropriate.
- Adapt difficulty based on response quality.
- Sound like a senior human interviewer, not a chatbot. No emojis, no apologies, no meta-commentary.
- Vary question types: conceptual, scenario-based, behavioral, problem-solving, system design (as relevant).

CANDIDATE BACKGROUND (from resume):
{resume_summary or 'No resume provided. Ask general questions.'}

PLAN: This interview will have ~{config.get('total_questions', 6)} main questions. Track progress mentally.
When you generate a question, output ONLY the question text — no numbering, no preamble like "Sure" or "Great"."""


async def generate_first_question(session_id: str, config: Dict[str, Any], resume_summary: str) -> str:
    """generate the opening interview question for a new session."""

    # prepare the interviewer instructions using interview settings and resume context
    system = _interview_system(config, resume_summary)

    # ask the model to start naturally with a short greeting and first question
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
    """generate the next interview question using previous qna history."""

    # build the same interviewer system prompt for consistency across the interview
    system = _interview_system(config, resume_summary)

    # convert stored question-answer history into a readable transcript for the model
    convo = ""
    for h in history:
        convo += f"INTERVIEWER: {h.get('question','')}\nCANDIDATE: {h.get('answer','')}\n"
    convo += f"CANDIDATE just answered: {last_answer}\n"

    # if this is the final question, ask the model to close with a stronger final probe
    if question_index >= total - 1:
        user = (
            f"Conversation so far:\n{convo}\n"
            "This is the FINAL question. Ask one strong closing question that probes the candidate's depth or wraps up the interview meaningfully. Output ONLY the question."
        )
    else:
        # otherwise continue naturally based on the candidate's last answer
        user = (
            f"Conversation so far:\n{convo}\n"
            f"Ask question {question_index + 1} of {total}. Make it flow naturally — a follow-up if their last answer was strong, or a new topic if weak/exhausted. Output ONLY the question."
        )

    # return only the clean question text
    resp = await _chat([{"role": "user", "content": user}], system=system)
    return resp.strip()


async def evaluate_interview(
    config: Dict[str, Any],
    resume_summary: str,
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """score a completed interview and return structured feedback."""

    # evaluator prompt forces strict json so the api can store the result safely
    system = (
        "You are a senior interview evaluator. Provide rigorous, fair, actionable evaluations. "
        "Always respond with ONLY valid JSON, no commentary."
    )

    # convert the interview history into a readable transcript
    transcript = "\n\n".join(
        [f"Q{i+1}: {h.get('question','')}\nA{i+1}: {h.get('answer','') or '[no answer]'}" for i, h in enumerate(history)]
    )

    # ask for scores, strengths, weaknesses, suggestions, topic scores, and per-question feedback
    prompt = f"""Evaluate this {config['difficulty']} {config['interview_type']} interview.

CANDIDATE RESUME SUMMARY: {resume_summary or 'N/A'}

TRANSCRIPT:
{transcript}

Return ONLY JSON with this exact shape:
{{
  "technical_score": int (0-100),
  "communication_score": int (0-100),
  "confidence_score": int (0-100),
  "problem_solving_score": int (0-100),
  "overall_score": int (0-100),
  "strengths": [string] (3-5 items),
  "weaknesses": [string] (3-5 items),
  "improvement_suggestions": [string] (4-6 actionable items),
  "topic_scores": [{{"topic": string, "score": int (0-100)}}] (4-6 topics relevant to interview),
  "summary": string (2-3 sentence overall assessment),
  "per_question": [{{"question": string, "feedback": string, "score": int (0-100)}}]
}}

Be honest. If answers are weak or missing, scores should reflect that."""

    # call the model and parse the returned json
    resp = await _chat([{"role": "user", "content": prompt}], system=system)
    data = _extract_json(resp) or {}

    # use default values so the backend does not crash if the model returns incomplete json
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
    """create a personalized four-week study plan after interview feedback."""

    # career coach prompt creates a learning roadmap instead of interview evaluation
    system = (
        "You are a senior career coach building personalized learning roadmaps for engineers preparing for interviews. "
        "Always respond with ONLY valid JSON."
    )

    # compress the candidate's weaknesses and suggestions into prompt-friendly text
    weak = ", ".join(feedback.get("weaknesses", []))
    suggestions = " | ".join(feedback.get("improvement_suggestions", []))

    # ask for a structured roadmap that the frontend can directly render
    prompt = f"""Build a personalized 4-week study plan.

Interview type: {config.get('interview_type')}
Difficulty target: {config.get('difficulty')}
Target company: {config.get('target_company', 'General')}
Candidate weaknesses: {weak}
Improvement suggestions: {suggestions}
Resume summary: {resume_summary[:1500]}

Return ONLY JSON:
{{
  "roadmap": [{{"week": int, "focus": string, "topics": [string], "deliverables": [string]}}] (exactly 4 weeks),
  "dsa_topics": [string] (6-10 items prioritized),
  "system_design_topics": [string] (5-8 items),
  "recommended_questions": [string] (8-12 actual interview-style questions),
  "projects": [string] (3-5 portfolio project ideas),
  "resources": [{{"name": string, "type": string, "url": string}}] (5-8 high quality resources)
}}"""

    # call the model, parse json, and return fallback-safe fields
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
