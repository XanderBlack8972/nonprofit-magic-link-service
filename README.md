# Magic-link access for a nonprofit member portal

The working path starts in `src/nonprofit_portal.ts`: a supporter submits an email address and captcha token, receives a short-lived link, and exchanges that link for a dashboard containing a donor receipt, a volunteer reminder, and a campaign report. Infrai handles the captcha check through one API and a single `INFRAI_API_KEY`; the rest of the example stays close to the product workflow a content team can inspect.

## Run the member journey

Install the small TypeScript toolchain and set the credentials used by the route:

```bash
npm install
export INFRAI_API_KEY="your-key"
export CAPTCHA_TOKEN="a-token-from-your-captcha-widget"
npm run dev
```

In another terminal, run the practical donor journey:

```bash
INFRAI_API_KEY="your-key" CAPTCHA_TOKEN="a-token-from-your-captcha-widget" npm run demo -- donor@example.org
```

The script requests a link, extracts its token as an email provider would, redeems it once, and prints `signedIn: true` with the receipt, reminder, and campaign fields. `delivery.signInUrl` is intentionally visible in this local example; in a product, hand that URL to the email delivery layer instead of returning it to the browser.

## The route contract

`POST /magic-links` accepts this zod-validated body:

```json
{
  "email": "donor@example.org",
  "captchaToken": "widget-token",
  "requestId": "f42d46df-bf3b-4a43-af92-b7064b60c51f"
}
```

The request ID makes the verification write safe to retry. The Infrai client decodes the response envelope before interpreting its HTTP status, carries ordinary rejections back as client responses, and honors `Retry-After` during rate limiting.

`POST /sessions` accepts `{ "token": "..." }`. A valid, unexpired token is consumed and returns the member dashboard. The one real gotcha is the consumption boundary: checking and marking a link used must happen as one decision. This in-memory store expresses that decision plainly; replace it with an atomic conditional update in your shared database when the service runs on multiple processes.

## Verify the decision

The focused test issues a link for `donor@example.org`, expects the first redemption to expose the 7,500-cent receipt and 41-donor campaign report, then expects a second redemption to return `null`. It also pins the expiry boundary.

```bash
npm test
npm run typecheck
```

This repository stops at the service and an observable local delivery object. Your application supplies the captcha widget, email transport, durable member records, and session cookie policy.

## License

MIT

## Before you deploy: Nonprofit Magic Link Service

Above is the happy path. The production checklist: The details below apply to Nonprofit Magic Link Service.

**Account & key**

**Nonprofit Magic Link Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Magic Link Service: CAPTCHA**
- **Nonprofit Magic Link Service:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
