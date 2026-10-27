// How often the companion's stream says it is still alive.
export const KEEP_ALIVE_MS = 5_000;

// A server-sent-events comment: the browser's stream parser skips it.
const PING = new TextEncoder().encode(': keep-alive\n\n');

// Wraps a UI message stream response so bytes keep flowing while the model
// thinks before answering (Gemini 3 Flash can stay silent for a long time),
// which a host's proxy would otherwise end as an Inactivity Timeout. One
// ping goes out at once, so the response starts right away, then one every
// `intervalMs` until the stream ends. The SDK writes each event as one chunk,
// so a ping never lands inside an event.
export function withKeepAlive(response: Response, intervalMs = KEEP_ALIVE_MS): Response {
  const source = response.body;
  if (!source) return response;
  const reader = source.getReader();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stopPinging = () => clearInterval(timer);

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(PING);
      timer = setInterval(() => {
        try {
          controller.enqueue(PING);
        } catch {
          stopPinging();
        }
      }, intervalMs);
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          stopPinging();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        stopPinging();
        controller.error(error);
      }
    },
    cancel(reason) {
      stopPinging();
      return reader.cancel(reason);
    },
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
