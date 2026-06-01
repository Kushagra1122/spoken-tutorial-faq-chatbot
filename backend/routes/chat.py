from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.answer import AnswerService

router = APIRouter(prefix="/api", tags=["chat"])

_answer_service: AnswerService | None = None


def set_answer_service(service: AnswerService) -> None:
    global _answer_service
    _answer_service = service


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class SourceItem(BaseModel):
    id: str
    question: str


class ChatResponseModel(BaseModel):
    answer: str
    confidence: str
    category: str | None = None
    sources: list[SourceItem]


@router.post("/chat", response_model=ChatResponseModel)
async def chat(request: ChatRequest) -> ChatResponseModel:
    if _answer_service is None:
        raise HTTPException(status_code=503, detail="Chat service not ready")

    result = _answer_service.answer(request.message.strip())
    return ChatResponseModel(
        answer=result.answer,
        confidence=result.confidence,
        category=result.category,
        sources=[SourceItem(**source) for source in result.sources],
    )


@router.get("/categories")
async def categories() -> dict[str, list[str]]:
    if _answer_service is None:
        raise HTTPException(status_code=503, detail="Chat service not ready")

    categories_set: dict[str, None] = {}
    for entry in _answer_service.retriever.entries:
        categories_set[entry.category] = None

    return {"categories": sorted(categories_set.keys())}
