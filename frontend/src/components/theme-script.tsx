export const THEME_STORAGE_KEY = "dock-theme";

/**
 * Runs before paint so the page never flashes the wrong theme. Kept as a raw
 * string because it must execute synchronously in <head>, before React hydrates.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
