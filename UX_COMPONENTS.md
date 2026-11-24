# UX components — V2.1

No additional dependencies are required.

- `MediaTrigger` accepts `slides: { src, alt, caption }[]`, the current `src`, and a server-rendered image as children. The viewer is dynamically imported after activation. Only the current full-size image is rendered. Decorative illustrations remain static.
- `MediaViewer` uses the native modal dialog for focus isolation, Escape and focus restoration. Arrow keys, buttons and horizontal swipes navigate images. Pinch zoom remains native. Captions stay visible.
- `WorkshopPhoto` connects workshop photographs to the shared set from `src/content/workshop.ts`. Published project photographs are grouped only within their project.
- `BeforeAfterComparison` remains available for verified before/after pairs. It uses a native range input with keyboard, pointer and touch support. No sample pairs are published.
- `Feedback` provides contextual status/error messages with accessible announcements. Form field errors remain beside their fields; notifications do not duplicate them in global toasts.
- `lockScroll` balances concurrent scroll locks and restores the previous inline styles. The mobile menu and viewer use it without changing server code.

API contracts, server validation, Prisma schema, upload inspection, rate limiting and data retention are unchanged. Personal data is not written to localStorage. Successful submission is acknowledged only after the API confirms persistence.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`.
Run `npm run test:integration` only with an isolated `TEST_DATABASE_URL` pointing to a database whose name ends in `_test`. Without it the integration suite skips itself. Do not use production credentials for interactive submission checks.

Browser checks must cover 320, 375, 768, 1440 and 1920 px, reduced motion, keyboard focus, menu scroll locking, photo navigation/closing and mocked form failure/success responses. A successful HTTP response alone does not verify those interactions.
