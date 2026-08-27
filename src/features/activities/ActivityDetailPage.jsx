import { ArrowLeft, Heart, Maximize2, Play, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../../components/layout";
import { activityById } from "./activityRegistry";
import {
  loadActivityHub,
  markActivityUsed,
  saveActivityHub,
  toggleActivityFavorite,
} from "./activityHubStore";
import "./ActivitiesPage.css";

export default function ActivityDetailPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const activity = activityById(activityId);
  const [store, setStore] = useState(loadActivityHub);
  if (!activity)
    return (
      <Page title="Activity Not Found">
        <Link className="studio-button studio-button--primary" to="/activities">
          Back to Activities
        </Link>
      </Page>
    );
  const Icon = activity.Icon;
  const favorite = store.favorites.includes(activity.id);
  const start = () => {
    saveActivityHub(markActivityUsed(store, activity.id));
    if (activity.route) navigate(activity.route);
  };
  const toggleFavorite = () => {
    const next = toggleActivityFavorite(store, activity.id);
    setStore(next);
    saveActivityHub(next);
  };
  return (
    <Page
      actions={
        <Link className="studio-button studio-button--secondary" to="/activities">
          <ArrowLeft size={17} /> Back to Activities
        </Link>
      }
      className="activity-detail-page"
      description={activity.description}
      title={activity.name}
    >
      <section className="activity-detail">
        <div className="activity-detail__visual">
          <Icon aria-hidden="true" size={56} />
        </div>
        <span className="resource-type-badge">{activity.type}</span>
        <p>
          {activity.tags.join(" · ")} · {activity.goals.join(" · ")}
        </p>
        {activity.status ? (
          <p className="activity-detail__status">{activity.status}</p>
        ) : null}
        <div className="activity-detail__actions">
          <button
            aria-pressed={favorite}
            className="studio-button studio-button--secondary"
            onClick={toggleFavorite}
            type="button"
          >
            <Heart fill={favorite ? "currentColor" : "none"} size={17} />{" "}
            {favorite ? "Favorited" : "Favorite"}
          </button>
          {activity.route && !activity.status ? (
            <button
              className="studio-button studio-button--primary"
              onClick={start}
              type="button"
            >
              <Play size={17} /> Start
            </button>
          ) : null}
          {activity.supportsInvite ? (
            <button
              className="studio-button studio-button--secondary"
              onClick={start}
              type="button"
            >
              <Users size={17} /> Invite Child
            </button>
          ) : null}
          {activity.supportsFullscreen ? (
            <button
              className="studio-button studio-button--secondary"
              onClick={start}
              type="button"
            >
              <Maximize2 size={17} /> Full Screen
            </button>
          ) : null}
        </div>
        <p className="activity-detail__how">
          <strong>How to use:</strong> Start when you are ready; opening this page does
          not add it to Recently Used.
        </p>
      </section>
    </Page>
  );
}
