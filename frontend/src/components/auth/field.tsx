type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
};

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  defaultValue,
  error,
  hint,
}: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 ${
          error
            ? "border-danger focus:ring-2 focus:ring-danger/20"
            : "border-border focus:border-accent focus:ring-2 focus:ring-accent/20"
        }`}
      />
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
