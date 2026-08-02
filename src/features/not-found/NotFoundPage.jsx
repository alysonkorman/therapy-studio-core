import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="system-message">
      <h1>Page not found</h1>
      <p>That Therapy Studio page does not exist.</p>
      <Link to="/">Return home</Link>
    </div>
  );
}
