import { Heart, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Page } from "../../components/layout";
import { activityRegistry, activityTypes } from "./activityRegistry";
import {
  loadActivityHub,
  saveActivityHub,
  toggleActivityFavorite,
} from "./activityHubStore";
import "./ActivitiesPage.css";

const typeLabels = {
  all: "All",
  game: "Games",
  activity: "Activities",
  builder: "Builders",
};

function ActivityCard({ activity, favorite, recent, onFavorite }) {
  const Icon = activity.Icon;
  return (
    <Link
      className={`activity-card activity-card--${activity.type}`}
      to={`/activities/${activity.id}`}
    >
      <div className="activity-card__visual">
        <Icon aria-hidden="true" size={34} />
      </div>
      <div>
        <span className="resource-type-badge">{activity.type}</span>
        <h3>{activity.name}</h3>
        <p>{activity.tags.slice(0, 2).join(" · ")}</p>
        {recent ? <small>Recently used</small> : null}
      </div>
      <button
        aria-label={`${favorite ? "Remove" : "Add"} ${activity.name} favorite`}
        aria-pressed={favorite}
        className={`activity-card__favorite ${favorite ? "is-favorite" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          onFavorite(activity.id);
        }}
        type="button"
      >
        <Heart fill={favorite ? "currentColor" : "none"} size={18} />
      </button>
    </Link>
  );
}

export default function ActivitiesPage() {
  const [store, setStore] = useState(loadActivityHub);
  const [context, setContext] = useState(store.context);
  const [restoredScrollY] = useState(store.context.scrollY);
  useEffect(() => {
    saveActivityHub({ ...store, context });
  }, [context, store]);
  useEffect(() => {
    window.scrollTo(0, restoredScrollY);
    const onScroll = () =>
      setContext((current) => ({ ...current, scrollY: window.scrollY }));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [restoredScrollY]);
  const goals = useMemo(
    () => [...new Set(activityRegistry.flatMap((item) => item.goals))].sort(),
    []
  );
  const filtered = useMemo(
    () =>
      activityRegistry
        .filter((item) => {
          const search =
            `${item.name} ${item.description} ${item.tags.join(" ")} ${item.goals.join(" ")} ${item.age} ${item.format}`.toLowerCase();
          return (
            (!context.search || search.includes(context.search.toLowerCase())) &&
            (context.type === "all" || item.type === context.type) &&
            (!context.ages.length ||
              context.ages.includes(item.age) ||
              item.age === "any") &&
            (!context.goals.length ||
              context.goals.some((goal) => item.goals.includes(goal))) &&
            (!context.formats.length || context.formats.includes(item.format)) &&
            (!context.shortcut ||
              (context.shortcut === "favorites"
                ? store.favorites.includes(item.id)
                : store.recent.includes(item.id)))
          );
        })
        .sort((a, b) =>
          context.sort === "az"
            ? a.name.localeCompare(b.name)
            : context.sort === "recent"
              ? store.recent.indexOf(a.id) - store.recent.indexOf(b.id)
              : 0
        ),
    [context, store]
  );
  const set = (patch) => setContext((current) => ({ ...current, ...patch }));
  const favorite = (id) => {
    const next = toggleActivityFavorite(store, id);
    setStore(next);
    saveActivityHub({ ...next, context });
  };
  const recentItems = store.recent
    .map((id) => activityRegistry.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, 6);
  const favoriteItems = activityRegistry
    .filter(
      (item) =>
        store.favorites.includes(item.id) && !recentItems.some(({ id }) => id === item.id)
    )
    .slice(0, 6);
  return (
    <Page
      className="activities-page"
      description="Find a visual, interactive tool for the moment you are in."
      title="Activities"
    >
      <section className="activities-search">
        <Search aria-hidden="true" size={20} />
        <input
          aria-label="Search activities"
          onChange={(event) => set({ search: event.target.value })}
          placeholder="Search activities…"
          value={context.search}
        />
      </section>
      <nav aria-label="Activity type" className="activities-tabs">
        {["all", ...activityTypes].map((type) => (
          <button
            aria-pressed={context.type === type}
            key={type}
            onClick={() => set({ type })}
            type="button"
          >
            {typeLabels[type]}
          </button>
        ))}
      </nav>
      <section className="activities-filters">
        <label>
          Age{" "}
          <select
            onChange={(event) =>
              set({ ages: event.target.value === "all" ? [] : [event.target.value] })
            }
            value={context.ages[0] ?? "all"}
          >
            <option value="all">All</option>
            <option value="child">Child</option>
            <option value="teen">Teen</option>
            <option value="any">Any Age</option>
          </select>
        </label>
        <label>
          Goal{" "}
          <select
            onChange={(event) =>
              set({ goals: event.target.value === "all" ? [] : [event.target.value] })
            }
            value={context.goals[0] ?? "all"}
          >
            <option value="all">All</option>
            {goals.map((goal) => (
              <option key={goal}>{goal}</option>
            ))}
          </select>
        </label>
        <label>
          Format{" "}
          <select
            onChange={(event) =>
              set({ formats: event.target.value === "all" ? [] : [event.target.value] })
            }
            value={context.formats[0] ?? "all"}
          >
            <option value="all">All</option>
            <option value="solo">Solo</option>
            <option value="shared">Shared</option>
            <option value="therapist">Therapist Led</option>
          </select>
        </label>
        <button
          aria-pressed={context.shortcut === "favorites"}
          onClick={() =>
            set({ shortcut: context.shortcut === "favorites" ? "" : "favorites" })
          }
          type="button"
        >
          Favorites
        </button>
        <button
          aria-pressed={context.shortcut === "recent"}
          onClick={() => set({ shortcut: context.shortcut === "recent" ? "" : "recent" })}
          type="button"
        >
          Recently Used
        </button>
        <label>
          Sort{" "}
          <select
            onChange={(event) => set({ sort: event.target.value })}
            value={context.sort}
          >
            <option value="recommended">Recommended</option>
            <option value="az">A–Z</option>
            <option value="recent">Recently Used</option>
          </select>
        </label>
      </section>
      {!context.search && !context.shortcut && context.type === "all" ? (
        <>
          <ActivityRow
            favorite={favorite}
            items={recentItems}
            store={store}
            title="Recently Used"
          />
          <ActivityRow
            favorite={favorite}
            items={favoriteItems}
            store={store}
            title="Favorites"
          />
        </>
      ) : null}
      <section className="activities-all">
        <header>
          <h2>All Activities</h2>
          <span>{filtered.length} available</span>
        </header>
        {activityTypes.map((type) => {
          const items = filtered.filter((item) => item.type === type);
          return items.length ? (
            <details key={type} open>
              <summary>
                {typeLabels[type]} <span>{items.length}</span>
              </summary>
              <div className="activities-grid">
                {items.map((item) => (
                  <ActivityCard
                    activity={item}
                    favorite={store.favorites.includes(item.id)}
                    key={item.id}
                    onFavorite={favorite}
                    recent={store.recent.includes(item.id)}
                  />
                ))}
              </div>
            </details>
          ) : null;
        })}
      </section>
    </Page>
  );
}
function ActivityRow({ title, items, store, favorite }) {
  return items.length ? (
    <section className="activities-row">
      <h2>{title}</h2>
      <div className="activities-grid">
        {items.map((item) => (
          <ActivityCard
            activity={item}
            favorite={store.favorites.includes(item.id)}
            key={item.id}
            onFavorite={favorite}
            recent={store.recent.includes(item.id)}
          />
        ))}
      </div>
    </section>
  ) : null;
}
