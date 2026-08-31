import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFaqs, updateFaq, type FaqItem } from "../api";

interface ChangeContentPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChangeContentPanel({ open, onClose }: ChangeContentPanelProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FaqItem | null>(null);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchFaqs();
      setFaqs(items);
      if (items.length > 0) {
        setSelectedId((current) => current ?? items[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load FAQ content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadFaqs();
    }
  }, [open, loadFaqs]);

  useEffect(() => {
    const selected = faqs.find((item) => item.id === selectedId) ?? null;
    setDraft(selected ? { ...selected } : null);
  }, [faqs, selectedId]);

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return faqs;
    return faqs.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
    );
  }, [faqs, search]);

  const handleSave = async () => {
    if (!draft) return;

    setSavingId(draft.id);
    setError(null);
    try {
      const updated = await updateFaq(draft.id, {
        category: draft.category,
        question: draft.question,
        answer: draft.answer,
        aliases: draft.aliases,
      });
      setFaqs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save FAQ entry");
    } finally {
      setSavingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="content-panel__backdrop" onClick={onClose}>
      <div
        className="content-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="content-panel__header">
          <div>
            <h2 id="content-panel-title">Change FAQ Content</h2>
            <p>Edit answers sourced from the BOT FAQs PDF. Changes apply immediately to the chatbot.</p>
          </div>
          <button type="button" className="content-panel__close" onClick={onClose}>
            Close
          </button>
        </div>

        {error && <div className="content-panel__error">{error}</div>}

        {loading ? (
          <p className="content-panel__loading">Loading FAQ content…</p>
        ) : (
          <div className="content-panel__body">
            <aside className="content-panel__list">
              <input
                type="search"
                className="content-panel__search"
                placeholder="Search questions…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="content-panel__items">
                {filteredFaqs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`content-panel__item${
                      selectedId === item.id ? " content-panel__item--active" : ""
                    }`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="content-panel__item-category">{item.category}</span>
                    <span className="content-panel__item-question">{item.question}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="content-panel__editor">
              {draft ? (
                <>
                  <label className="content-panel__field">
                    <span>Category</span>
                    <input
                      value={draft.category}
                      onChange={(event) =>
                        setDraft({ ...draft, category: event.target.value })
                      }
                    />
                  </label>
                  <label className="content-panel__field">
                    <span>Question</span>
                    <input
                      value={draft.question}
                      onChange={(event) =>
                        setDraft({ ...draft, question: event.target.value })
                      }
                    />
                  </label>
                  <label className="content-panel__field">
                    <span>Answer</span>
                    <textarea
                      rows={12}
                      value={draft.answer}
                      onChange={(event) =>
                        setDraft({ ...draft, answer: event.target.value })
                      }
                    />
                  </label>
                  <label className="content-panel__field">
                    <span>Aliases (comma separated)</span>
                    <input
                      value={draft.aliases.join(", ")}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          aliases: event.target.value
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <div className="content-panel__actions">
                    <button
                      type="button"
                      className="content-panel__save"
                      onClick={() => void handleSave()}
                      disabled={savingId === draft.id}
                    >
                      {savingId === draft.id ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="content-panel__empty">Select a FAQ entry to edit.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
