export default function IconSearch({ onChange, value }) {
  return (
    <label className="icon-browser__search">
      Search Icons
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder="Try animal, reading, calm, or school"
        type="search"
        value={value}
      />
    </label>
  );
}
