export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const icon =
    toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ";

  return (
    <div
      key={toast.id}
      className={`toast toast-${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">{icon}</span>

      <span className="toast-message">{toast.message}</span>

      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
