export default function Button({
  className = "",
  type = "button",
  variant = "primary",
  ...props
}) {
  const classes = ["studio-button", `studio-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} type={type} {...props} />;
}
