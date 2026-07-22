export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  if (!value) return "Email is required.";
  if (!EMAIL_RE.test(value)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "Include at least one letter and one number.";
  }
  return null;
}

export function validateFullName(value: string): string | null {
  if (!value.trim()) return "Name is required.";
  if (value.trim().length < 2) return "That name looks too short.";
  return null;
}
