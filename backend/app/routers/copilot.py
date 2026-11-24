"""Gemini Copilot Router — POST /api/v1/copilot/command"""
from fastapi import APIRouter
from app.models.schemas import CopilotCommandRequest, CopilotCommandResponse
from app.services.copilot import handle_copilot_command

router = APIRouter()

@router.post(
    "/command",
    response_model=CopilotCommandResponse,
    summary="Gemini AI Natural-Language Trip Command Router",
)
async def copilot_command(req: CopilotCommandRequest) -> CopilotCommandResponse:
    """
    Sends command to Gemini (structured JSON output) → concrete state mutations.
    Falls back to deterministic keyword matching if GEMINI_API_KEY is not set.
    """
    return await handle_copilot_command(req)
