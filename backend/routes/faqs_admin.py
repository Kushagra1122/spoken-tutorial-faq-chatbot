from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from routes.chat import get_answer_service
from services.auth import TokenData, get_current_user
from services.faq_store import FaqEntry, load_faqs, save_faqs

router = APIRouter(prefix="/api/faqs", tags=["faqs-admin"])


class FaqItemModel(BaseModel):
    id: str
    category: str
    question: str
    answer: str
    aliases: list[str] = Field(default_factory=list)


class FaqUpdateRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=120)
    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1, max_length=8000)
    aliases: list[str] = Field(default_factory=list, max_length=20)


def _to_model(entry: FaqEntry) -> FaqItemModel:
    return FaqItemModel(
        id=entry.id,
        category=entry.category,
        question=entry.question,
        answer=entry.answer,
        aliases=entry.aliases,
    )


@router.get("", response_model=list[FaqItemModel])
async def list_faqs(
    current_user: TokenData = Depends(get_current_user),
) -> list[FaqItemModel]:
    return [_to_model(entry) for entry in load_faqs()]


@router.put("/{faq_id}", response_model=FaqItemModel)
async def update_faq(
    faq_id: str,
    request: FaqUpdateRequest,
    current_user: TokenData = Depends(get_current_user),
) -> FaqItemModel:
    entries = load_faqs()
    index = next((i for i, entry in enumerate(entries) if entry.id == faq_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="FAQ entry not found")

    updated = FaqEntry(
        id=faq_id,
        category=request.category.strip(),
        question=request.question.strip(),
        answer=request.answer.strip(),
        aliases=[alias.strip() for alias in request.aliases if alias.strip()],
    )
    entries[index] = updated
    save_faqs(entries)

    service = get_answer_service()
    if service is not None:
        service.retriever.reload()

    return _to_model(updated)
