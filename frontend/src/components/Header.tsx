interface HeaderProps {
  connected?: boolean;
  checking?: boolean;
  onRetry?: () => void;
  onChangeContent?: () => void;
  isAuthenticated?: boolean;
  userEmail?: string;
  onLogout?: () => void;
}

export function Header({
  connected = false,
  checking = false,
  onRetry,
  onChangeContent,
  isAuthenticated = false,
  userEmail,
  onLogout,
}: HeaderProps) {
  const statusLabel = checking
    ? "Checking…"
    : connected
      ? "Online"
      : "Offline";

  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo" aria-hidden="true">
          <span>ST</span>
        </div>
        <div className="header__titles">
          <h1 className="header__title">
            Spoken Tutorial <span className="header__title-accent">FAQ</span>
          </h1>
          <p className="header__subtitle">
            Official guidance for organisers and students
          </p>
        </div>
      </div>

      <div className="header__actions">
        <button
          type="button"
          className="header__change-content"
          onClick={onChangeContent}
        >
          Change Content
        </button>
        {isAuthenticated && userEmail && (
          <div className="header__user">
            <span className="header__user-email">{userEmail}</span>
            <button type="button" className="header__logout" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
        <button
          type="button"
          className={`header__status ${connected ? "header__status--online" : ""}`}
          onClick={onRetry}
          title={connected ? "Connected to backend" : "Click to retry connection"}
          aria-label={
            connected ? "Assistant online" : "Assistant offline — click to retry"
          }
        >
          <span className="header__status-dot" />
          {statusLabel}
        </button>
      </div>
    </header>
  );
}
