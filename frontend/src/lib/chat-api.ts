import {
  API_BASE_URL,
  ApiError,
  api,
  notifySessionExpired,
  refreshSession,
} from "@/lib/axios.config";
import { ERROR_CODES } from "@/lib/constants";

/**
 * Who said it, in the model's own vocabulary, which is how the backend stores
 * a transcript, so it can be replayed into a prompt with nothing to translate.
 * Turning these into "You" and "Dock" is the panel's job.
 */
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  created_at: string;
};

export type ChatHistory = {
  /** Null for a topic nobody has chatted to yet, which is most cards on a canvas. */
  session_id: string | null;
  limit_reached: boolean;
  messages: ChatMessage[];
};

export type ChatReply = {
  session_id: string;
  reply: ChatMessage;
  limit_reached: boolean;
};

/**
 * Open the streaming send.
 *
 * `fetch`, not the axios instance, and this is the one place in the app that is
 * true. Axios in the browser is XHR underneath, and XHR surfaces a response body
 * only once it is complete — it has no way to hand back the first sentence of a
 * reply while the rest is still arriving. `fetch` exposes `response.body` as a
 * `ReadableStream`, which is the whole feature. `EventSource` is the other
 * obvious candidate and is worse: it cannot send a POST body.
 *
 * What that costs is the interceptor, so the two things it did are done by hand
 * here: a 401 is retried once behind the shared `refreshSession` promise, and
 * every failure leaves as an `ApiError` like everywhere else.
 */
async function openStream(
  path: string,
  body: unknown,
  signal: AbortSignal | undefined,
  retry = true,
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (response.ok) return response;

  const failure = (await response.json().catch(() => null)) as {
    code?: string;
    detail?: string;
  } | null;

  // The same split the interceptor makes: a 401 from a route that wants the
  // student's *provider* key is not an expired session, and refreshing would
  // rotate their tokens to learn nothing.
  if (
    response.status === 401 &&
    retry &&
    failure?.code !== ERROR_CODES.apiKeyNotConfigured
  ) {
    try {
      await refreshSession();
    } catch {
      notifySessionExpired();
      throw new ApiError(401, "session_expired", "Your session has expired.");
    }
    return openStream(path, body, signal, false);
  }

  throw new ApiError(
    response.status,
    failure?.code ?? "request_failed",
    failure?.detail ?? "Something went wrong. Please try again.",
  );
}

/** One `event:`/`data:` pair, already split off the wire. */
type SseFrame = { event: string; data: string };

/**
 * Cut a byte stream into SSE frames.
 *
 * Frames are separated by a blank line and a chunk boundary falls wherever the
 * network puts it, so the tail of the buffer is kept until the next read
 * completes it. `{ stream: true }` on the decoder is the same idea one level
 * down: a multi-byte character split across two chunks would otherwise decode
 * to a replacement character, which in a chat reply means a mangled em dash or
 * a broken emoji.
 */
async function* readFrames(response: Response): AsyncGenerator<SseFrame> {
  const body = response.body;
  if (!body) throw new ApiError(0, "network_error", "The reply stream was empty.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let split = buffer.indexOf("\n\n");
      while (split !== -1) {
        const raw = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        split = buffer.indexOf("\n\n");

        let event = "message";
        const data: string[] = [];
        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5).trim());
        }
        if (data.length > 0) yield { event, data: data.join("\n") };
      }
    }
  } finally {
    // Runs on an early `break` from the consumer too — closing the panel
    // mid-reply must hang up on the server, not leave the response draining.
    reader.cancel().catch(() => {});
  }
}

/** Learn mode's calls. One place per endpoint. */
export const chatApi = {
  async history(spaceId: string, topicId: string): Promise<ChatHistory> {
    const { data } = await api.get<ChatHistory>(
      `/spaces/${spaceId}/topics/${topicId}/chat`,
    );
    return data;
  },

  async send(
    spaceId: string,
    topicId: string,
    message: string,
  ): Promise<ChatReply> {
    const { data } = await api.post<ChatReply>(
      `/spaces/${spaceId}/topics/${topicId}/chat`,
      { message },
    );
    return data;
  },

  /**
   * Send one message and read the reply as it is written.
   *
   * `onToken` is called with each fragment; the resolved `ChatReply` is the
   * stored message, which is what the transcript should hold once the stream is
   * over. The two are the same text, so a caller renders the fragments while
   * they arrive and then throws them away for the stored copy.
   *
   * A failure the server hit *after* the first byte arrives as an `error` frame
   * rather than a status code, because the status line was spent on 200. It is
   * raised as the same `ApiError` the non-streaming send would have thrown, so
   * a caller branches on `code` without caring which route it used.
   */
  async stream(
    spaceId: string,
    topicId: string,
    message: string,
    onToken: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<ChatReply> {
    const response = await openStream(
      `/spaces/${spaceId}/topics/${topicId}/chat/stream`,
      { message },
      signal,
    );

    let done: ChatReply | null = null;

    for await (const frame of readFrames(response)) {
      if (frame.event === "token") {
        onToken((JSON.parse(frame.data) as { text: string }).text);
      } else if (frame.event === "done") {
        const payload = JSON.parse(frame.data) as {
          session_id: string;
          reply: ChatMessage;
        };
        done = { ...payload, limit_reached: false };
      } else if (frame.event === "error") {
        const failure = JSON.parse(frame.data) as {
          status: number;
          code: string;
          detail: string;
        };
        throw new ApiError(failure.status, failure.code, failure.detail);
      }
    }

    if (!done) {
      // The connection closed with neither a `done` nor an `error`: dropped
      // mid-reply. Whatever the student read is not stored, so say so rather
      // than resolving as though the turn completed.
      throw new ApiError(
        0,
        "network_error",
        "The connection dropped before the reply finished. Please try again.",
      );
    }
    return done;
  },
};
