import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError, verifyHuman } from "./infrai_captcha.js";
import { MagicLinkStore } from "./magic_link_store.js";

const requestLinkSchema = z.object({
  email: z.string().email(),
  captchaToken: z.string().min(1),
  requestId: z.string().uuid(),
}).strict();

const redeemLinkSchema = z.object({ token: z.string().min(1) }).strict();
const store = new MagicLinkStore();

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  try {
    if (request.method === "POST" && request.url === "/magic-links") {
      const input = requestLinkSchema.parse(await readJson(request));
      await verifyHuman(input.captchaToken, input.requestId);
      const link = store.issue(input.email, Date.now());
      response.writeHead(201).end(JSON.stringify({
        delivery: { to: input.email, signInUrl: `http://localhost:3000/session?token=${link.token}` },
        expiresAt: new Date(link.expiresAt).toISOString(),
      }));
      return;
    }

    if (request.method === "POST" && request.url === "/sessions") {
      const input = redeemLinkSchema.parse(await readJson(request));
      const dashboard = store.redeem(input.token, Date.now());
      if (!dashboard) {
        response.writeHead(401).end(JSON.stringify({ error: "Link is invalid or expired" }));
        return;
      }
      response.writeHead(200).end(JSON.stringify({ signedIn: true, dashboard }));
      return;
    }

    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.writeHead(400).end(JSON.stringify({ error: "Invalid request", details: error.flatten() }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.message, code: error.code }));
      return;
    }
    response.writeHead(500).end(JSON.stringify({ error: "Request could not be completed" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Nonprofit portal listening on http://localhost:${port}`));
