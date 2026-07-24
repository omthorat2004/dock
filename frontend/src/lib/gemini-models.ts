/**
 * The Gemini models a user can pick in the API-key form.
 *
 * The backend does not enumerate these (it stores whatever `model_version` is
 * sent and lets an unknown model surface as a provider error on first use), so
 * this list is the single place the choices are defined. Edit it to match the
 * real Gemini catalogue; the first entry is the default for a new user.
 */
export const GEMINI_MODELS = [
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash — free, fast" },
  { value: "gemini-3.6-pro", label: "Gemini 3.6 Pro — deeper reasoning" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].value;
