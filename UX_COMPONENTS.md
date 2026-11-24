# UX components — V2.1

Scroll reveals use `motion@12.40.0` via `motion/react`. No other direct animation dependency is required.

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


## Scroll reveal — V2.3

`Reveal` accepts `type` (`up`, `fade`, `side`), `delay`, `duration`, `amount`, `as`, `className`, `id`, and server-rendered `children`. Defaults: 620 ms, 20 px up, easing [0.22, 1, 0.36, 1], viewport amount 0.2, once only. A 160 px bottom viewport margin starts the transition just before most blocks become visible, without pre-hiding server content.

`RevealGroup` keeps the existing list/grid element and supplies a stagger interval (60–100 ms). `RevealItem` uses its `index` and caps the delay at 320 ms. Every item observes its own viewport entry, so tall lists do not wait for the whole section.

The server renders visible content with `initial={false}`. Motion starts finite keyframe variants only when an eligible block enters view. Content already visible at hydration is left unchanged. The first-screen CSS animation remains independent. Reduced motion and keyboard focus immediately reveal content. There is no hidden CSS fallback and no custom scroll listener. The former global MotionController has been removed to prevent duplicate effects.

Run `npm run test:motion` to check server-visible content and list semantics. This is not a substitute for browser testing of scrolling, touch, reduced motion and page transitions.
