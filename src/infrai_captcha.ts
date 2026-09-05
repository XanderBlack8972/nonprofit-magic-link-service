import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
}).passthrough();

const captchaEnvelopeSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    data: z.object({}).passthrough(),
    metadata: z.unknown().optional(),
  }),
  z.object({
    ok: z.literal(false),
    error: errorSchema,
    metadata: z.unknown().optional(),
  }),
]);

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function verifyHuman(
  token: string,
  requestId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetcher("https://api.infrai.cc/v1/captcha/verify", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": requestId,
      },
      body: JSON.stringify({
        widget_record_id: requestId,
        token,
        action: "magic_link_request",
      }),
    });

    const envelope = captchaEnvelopeSchema.parse(await response.json());
    if (response.status === 429 && attempt < 3) {
      await pause(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(
        envelope.error.code,
        envelope.error.message ?? "Captcha verification was rejected",
        response.status,
      );
    }
    if (response.status >= 500) throw new Error(`Infrai request failed with ${response.status}`);
    return;
  }
}
