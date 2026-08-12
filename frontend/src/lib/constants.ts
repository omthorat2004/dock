/**
 * Product limits and the API error codes the UI branches on.
 *
 * The limits are mirrors of the server's, which is the authority: the backend
 * declares them in `models/space.py` and `models/chat.py` and enforces them on
 * every request. They exist here so a card can retire its own button and say
 * why *before* a call it knows will be refused, not so the client can decide.
 */

/** The whole video shelf for one topic. Mirrors `MAX_YOUTUBE_LINKS`. */
export const MAX_YOUTUBE_LINKS = 20;

/** How many videos one "find more" press adds. Mirrors `YOUTUBE_LINKS_PER_REQUEST`. */
export const YOUTUBE_LINKS_PER_REQUEST = 5;

/** How many messages travel verbatim with each prompt. Mirrors `RECENT_MESSAGE_WINDOW`. */
export const RECENT_MESSAGE_WINDOW = 10;

/**
 * Error codes from the API. Both 401s below mean opposite things: one is a
 * dead session, the other a signed-in user who has not set up a model yet.
 */
export const ERROR_CODES = {
  /** 401: signed in, but no provider key. Send them to /api-key, not /login. */
  apiKeyNotConfigured: "api_key_not_configured",
  /** 401: signed in, key set, but the provider rejected it. Also /api-key. */
  invalidProviderKey: "invalid_provider_key",
  /** 413: this topic's conversation no longer fits the model's input budget. */
  tokenLimitReached: "token_limit_reached",
  /** 409: the topic's video shelf is full. */
  youtubeLimitReached: "youtube_limit_reached",
  /**
   * 429: YouTube's own quota, not the student's model key. Waiting is the
   * only fix, so the panel says so rather than pointing at /api-key.
   */
  youtubeRateLimited: "youtube_rate_limited",
  /** 503: YouTube search is unreachable or not configured on the server. */
  youtubeUnavailable: "youtube_unavailable",
} as const;

/**
 * Is this 401 about the student's *provider* key rather than their session?
 *
 * The distinction is load bearing, and getting it wrong is worse than it
 * sounds. A 401 normally means the session died, so the axios interceptor
 * refreshes and, if that fails, signs the user out and sends them to /login.
 * But both codes below come back from a perfectly good session — one where the
 * model key is missing or was rejected by the provider. Treating either as a
 * dead session would rotate their tokens for nothing and, on a failed refresh,
 * throw them out of the app because they pasted a bad Gemini key.
 *
 * So: never refresh on these, and point the user at /api-key.
 */
export function isProviderKeyError(code: string | undefined): boolean {
  return (
    code === ERROR_CODES.apiKeyNotConfigured ||
    code === ERROR_CODES.invalidProviderKey
  );
}
