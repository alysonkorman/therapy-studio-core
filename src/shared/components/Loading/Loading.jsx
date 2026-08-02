export default function Loading({ label = "Loading Therapy Studio…" }) {
  return (
    <div aria-live="polite" className="system-message" role="status">
      <p>{label}</p>
    </div>
  );
}
