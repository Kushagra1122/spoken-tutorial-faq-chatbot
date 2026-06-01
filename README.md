# Spoken Tutorial FAQ Chatbot

A web chatbot that answers questions from the Spoken Tutorial BOT FAQs using semantic search and OpenAI. Answers are grounded in curated FAQ data so facts like limits (500 students), validation time (48 hours), and pass marks (40%) stay accurate.

## Prerequisites

- Python 3.10+
- [OpenAI API key](https://platform.openai.com/api-keys)

## Setup

1. Copy environment file and add your API key:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY
```

2. Install backend dependencies:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

3. Validate FAQ data (optional):

```bash
python scripts/build_faqs.py
```

## Run

**Terminal 1 — backend:**

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend (React + Vite):**

```bash
cd frontend
npm install
cp .env.example .env   # optional: set VITE_API_BASE
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To point the UI at a different API URL, set `VITE_API_BASE` in `frontend/.env`, use `?api=http://localhost:8000`, or set `localStorage.faq_api_base`.

## API

### `POST /api/chat`

```json
{ "message": "can organiser and invigilator be same?" }
```

Response:

```json
{
  "answer": "No. Organiser and Invigilator cannot be the same person for the same batch.",
  "confidence": "high",
  "sources": [{ "id": "organiser_invigilator_different", "question": "..." }]
}
```

### `GET /api/health`

Health check.

### `GET /api/categories`

Lists FAQ categories.

## How it works

1. All Q&A pairs live in [`data/faqs.json`](data/faqs.json) (source of truth).
2. On startup, questions + aliases are embedded with OpenAI `text-embedding-3-small`.
3. User queries are embedded and matched by cosine similarity.
4. **High confidence** (≥ 0.82): return the canonical FAQ answer verbatim.
5. **Medium confidence** (0.65–0.82): OpenAI rephrases using only retrieved context.
6. **Low confidence** (< 0.65): refuse rather than guess.

Tune thresholds via `SIMILARITY_HIGH` and `SIMILARITY_LOW` in `.env`.

## Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

Integration retrieval tests (paraphrase → correct FAQ id) run only when `OPENAI_API_KEY` is set.

## Manual smoke questions

Try these in the chat UI after starting both servers:

**Master Batch**

1. What is a Master Batch?
2. Can I add column headings to my CSV?
3. How many students can I upload at once?
4. What if I have more than 500 students?
5. How long does validation take?

**Test & Invigilator**

6. How do I request an online test?
7. Can the organiser also be the invigilator?
8. Do I need separate tests for C and C++?
9. Why didn't my student get a certificate?
10. What is the minimum score for a certificate?

**Technical & Support**

11. Which browser should we use?
12. Can workshops run offline?
13. Student forgot password — what to do?
14. Email ID already used — what now?
15. What should I do after Master Batch is verified?

## Project structure

```
chat-bot/
├── data/faqs.json          # Curated FAQ knowledge base
├── docs/BOT-FAQs.pdf       # Original PDF reference
├── backend/                # FastAPI + RAG
└── frontend/               # React + Vite chat UI
```

## Source document

FAQ content is derived from `docs/BOT-FAQs.pdf` (Spoken Tutorial organiser/student support).
