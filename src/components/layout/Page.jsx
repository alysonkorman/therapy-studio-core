import "./layout.css";

export default function Page({ actions, children, className = "", description, title }) {
  const classes = ["studio-page", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <header className="studio-page__header">
        <div className="studio-page__heading">
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="studio-page__actions">{actions}</div> : null}
      </header>
      <div className="studio-page__content">{children}</div>
    </div>
  );
}
