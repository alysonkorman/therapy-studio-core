import { sampleResources } from "../../data/sampleResources";

export default function InterventionsPage() {
  return (
    <div>
      <h1>Interventions</h1>

      <div
        style={{
          display: "grid",
          gap: 20,
          marginTop: 30,
        }}
      >
        {sampleResources.map((resource) => (
          <article
            key={resource.id}
            style={{
              background: "white",
              borderRadius: 18,
              padding: 24,
              border: "1px solid #ddd",
            }}
          >
            <h2>{resource.title}</h2>

            <p>{resource.description}</p>

            <p>
              <strong>Duration:</strong>{" "}
              {resource.durationMinutes} minutes
            </p>

            <p>
              <strong>Goals</strong>
            </p>

            <ul>
              {resource.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>

            <p>
              <strong>Works Well When</strong>
            </p>

            <ul>
              {resource.worksWellWhen.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p>
              <strong>Kids Who Like</strong>
            </p>

            <ul>
              {resource.kidsWhoLike.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}