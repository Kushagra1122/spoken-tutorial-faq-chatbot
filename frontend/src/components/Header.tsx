interface HeaderProps {
  connected?: boolean;
}

export function Header({ connected = true }: HeaderProps) {
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
      <div
        className={`header__status ${connected ? "header__status--online" : ""}`}
        role="status"
        aria-label={connected ? "Assistant online" : "Assistant offline"}
      >
        <span className="header__status-dot" />
        {connected ? "Online" : "Offline"}
      </div>
    </header>
  );
}
