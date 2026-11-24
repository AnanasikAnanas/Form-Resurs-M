import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Reveal, RevealGroup, RevealItem } from "../src/components/reveal";

for (const type of ["up", "fade", "side"] as const) {
  test(`${type}: server content stays visible without JavaScript`, () => {
    const html = renderToStaticMarkup(<Reveal type={type}>Workshop content</Reveal>);
    assert.match(html, /Workshop content/);
    assert.doesNotMatch(html, /opacity:\s*0|visibility:\s*hidden|display:\s*none/);
  });
}

test("stagger groups preserve semantic lists and visible server items", () => {
  const html = renderToStaticMarkup(<RevealGroup as="ol" className="steps">
    {[0, 1, 2].map(index => <RevealItem key={index} index={index} as="li">Stage {index}</RevealItem>)}
  </RevealGroup>);
  assert.match(html, /^<ol class="steps">/);
  assert.equal((html.match(/<li\b/g) || []).length, 3);
  assert.doesNotMatch(html, /opacity:\s*0/);
});
