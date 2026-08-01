import { interventions } from "../../data/resources/interventions";

export default function InterventionsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Resource Library</span>
          <h1>Interventions</h1>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1.5rem",
          marginTop: "2rem",
        }}
      >
        {interventions.map((resource) => (
          <article
            key={resource.id}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              border: "1px solid #ddd",
              boxShadow: "0 8px 24px rgba(0,0,0,.05)",
            }}
          >
            <h2>{resource.title}</h2>

            <p>{resource.description}</p>

            <p>
              <strong>Duration:</strong>{" "}
              {resource.durationMinutes} min
            </p>

            <p>
              <strong>Telehealth:</strong>{" "}
              {resource.telehealthFriendly ? "✓ Yes" : "No"}
            </p>

            <h3>Works Well When</h3>

            <ul>
              {resource.worksWellWhen.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h3>Kids Who Like</h3>

            <ul>
              {resource.kidsWhoLike.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h3>Goals</h3>

            <ul>
              {resource.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}