export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-subtle px-3.5 py-2.5 text-sm text-danger"
    >
      {message}
    </p>
  );
}
