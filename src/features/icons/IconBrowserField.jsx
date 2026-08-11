import { useEffect, useRef, useState } from "react";

import IconBrowser from "./IconBrowser";
import IconRenderer from "./IconRenderer";

export default function IconBrowserField({
  actionLabel = "Choose Icon",
  label,
  onPreview,
  onSave,
  value,
}) {
  const [open, setOpen] = useState(false);
  const hasOpened = useRef(false);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open && hasOpened.current) triggerRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div aria-label={label} className="icon-browser-field" role="group">
      <span>{label}</span>
      <button
        aria-label={`${actionLabel} for ${label}`}
        className="icon-browser-field__trigger"
        onClick={() => {
          hasOpened.current = true;
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        <IconRenderer iconId={value} size={32} />
        {actionLabel}
      </button>
      {open ? (
        <IconBrowser
          label={label}
          onClose={close}
          onConfirm={(iconId) => {
            onPreview?.(iconId);
            void onSave(iconId);
          }}
          value={value}
        />
      ) : null}
    </div>
  );
}
