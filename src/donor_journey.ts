import { randomUUID } from "node:crypto";

const baseUrl = process.env.PORT ? `http://localhost:${process.env.PORT}` : "http://localhost:3000";
const email = process.argv[2] ?? "donor@example.org";
const captchaToken = process.env.CAPTCHA_TOKEN;
if (!captchaToken) throw new Error("CAPTCHA_TOKEN is required");

const linkResponse = await fetch(`${baseUrl}/magic-links`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, captchaToken, requestId: randomUUID() }),
});
const linkResult = await linkResponse.json() as { delivery: { signInUrl: string } };
const token = new URL(linkResult.delivery.signInUrl).searchParams.get("token");
if (!token) throw new Error("Sign-in token was not returned");

const sessionResponse = await fetch(`${baseUrl}/sessions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token }),
});
console.log(JSON.stringify(await sessionResponse.json(), null, 2));
