import { useId } from "react";

import "./layout.css";

export default function Section({
  actions,
  children,
  className = "",
  description,
  title,
}) {
  const headingId = useId();
  const classes = ["studio-section", className].filter(Boolean).join(" ");

  return (
    <section aria-labelledby={title ? headingId : undefined} className={classes}>
      {title || description || actions ? (
        <header className="studio-section__header">
          <div>
            {title ? <h2 id={headingId}>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="studio-section__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
