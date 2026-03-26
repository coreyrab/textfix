<h1 align="center">EditCopy</h1>

<p align="center">
  <strong>Edit copy visually. Export for your coding agent.</strong>
</p>

<p align="center">
  Click any text on a live page, edit it inline, and get structured output<br>you can paste straight into your AI coding agent.
</p>

<p align="center">
  Works with Claude Code &middot; Cursor &middot; Codex &middot; Copilot &middot; OpenCode &middot; Cline
</p>

<br>

```diff
  # Copy Edit Requests — 2 changes

- Start your free trial today
+ Try it free for 14 days — no credit card needed

- Learn more about our enterprise solutions
+ Book a demo with our team

  Location: Under heading "Pricing" → div.hero-cta
```

---

## The problem

When vibe-coding, the AI gets the UI built fast — but the copy always needs a human touch. Headlines are generic, CTAs are bland, descriptions miss the tone you want.

The painful part isn't knowing *what* to change — it's communicating *where* to change it:

> "Update the hero subtitle — no, not that one, the one below the pricing cards — to something more conversational"

**EditCopy eliminates this.** Click the text, rewrite it, and get precise find-and-replace instructions the agent can act on immediately.

## How it works

1. **Activate** — Click the bookmarklet on any page
2. **Click & edit** — Hover over text elements, click to rewrite inline with a live preview
3. **Export** — Copy structured markdown with the original text, replacement, and location context

## Output format

When you copy your changes, EditCopy generates agent-optimized markdown:

```markdown
### 1. `<p>` — section.hero > div > p

**Location context:**
- Under heading: "Pricing"
- Parent: `div.hero-cta`
- Text before: "$29 / month"

**Search for:**
Start your free trial today

**Replace with:**
Try it free for 14 days — no credit card needed
```

The agent gets the exact string to search for, what to replace it with, and enough surrounding context to find the right element — even on long pages with repeated patterns.

## Install

**Bookmarklet (recommended):**

1. Visit the [EditCopy page](https://coreyrab.github.io/editcopy) (or open `index.html` locally)
2. Drag the "Drag to bookmarks bar" button to your bookmarks bar
3. Click it on any page to activate

**Or load manually via DevTools console:**

```js
const s = document.createElement('script');
s.src = 'https://raw.githubusercontent.com/coreyrab/editcopy/main/copy-editor.js';
document.body.appendChild(s);
```

## Features

- **Live preview** — See text changes on the page as you type, before committing
- **Draggable editor** — Move the edit popover out of the way when it covers content
- **Change tracking** — All edits logged in a floating panel with visual indicators
- **One-click export** — Copy all changes as structured markdown
- **Location context** — Each change includes nearest heading, parent element, and surrounding text
- **Prompt mode** — Describe how the agent should rewrite text instead of editing directly
- **Toggle on/off** — Click the bookmarklet again or press Escape to deactivate
- **Zero dependencies** — Single vanilla JS file, works on any site

## Local development

```bash
git clone https://github.com/coreyrab/editcopy.git
cd editcopy
python3 -m http.server 8787
# Open http://localhost:8787
```

## License

MIT
