export default function IconSidebar({ activeGroup, groups, onSelect }) {
  return (
    <nav aria-label="Icon folders" className="icon-browser__sidebar">
      <p>Folders</p>
      {groups.map((group) => (
        <button
          aria-current={activeGroup === group.id ? "true" : undefined}
          key={group.id}
          onClick={() => onSelect(group.id)}
          type="button"
        >
          <span>{group.label}</span>
          <span>{group.count}</span>
        </button>
      ))}
    </nav>
  );
}
