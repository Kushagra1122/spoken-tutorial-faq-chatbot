from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes.chat import router as chat_router, set_answer_service
from routes.voice import router as voice_router
from services.answer import AnswerService
from services.retriever import FaqRetriever


@asynccontextmanager
async def lifespan(app: FastAPI):
    retriever = FaqRetriever()
    retriever.initialize()
    set_answer_service(AnswerService(retriever))
    yield


app = FastAPI(
    title="Spoken Tutorial FAQ Chatbot",
    description="Answers questions from the Spoken Tutorial BOT FAQs.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(voice_router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
