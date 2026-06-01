from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.answer import AnswerService
from services.history import HistoryMessage

router = APIRouter(prefix="/api", tags=["chat"])

_answer_service: AnswerService | None = None


def set_answer_service(service: AnswerService) -> None:
    global _answer_service
    _answer_service = service


class HistoryItem(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[HistoryItem] = Field(default_factory=list, max_length=20)


class SourceItem(BaseModel):
    id: str
    question: str


class ChatResponseModel(BaseModel):
    answer: str
    confidence: str
    category: str | None = None
    sources: list[SourceItem]


def _to_history(items: list[HistoryItem]) -> list[HistoryMessage]:
    return [HistoryMessage(role=item.role, content=item.content.strip()) for item in items]


@router.post("/chat", response_model=ChatResponseModel)
async def chat(request: ChatRequest) -> ChatResponseModel:
    if _answer_service is None:
        raise HTTPException(status_code=503, detail="Chat service not ready")

    history = _to_history(request.history[-20:])
    result = _answer_service.answer(request.message.strip(), history=history)
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
