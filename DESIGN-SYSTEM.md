# Flowstate Client Portal — Design System

Source of truth: the **flowstate-website** skill (FlowstateRevenue.com brand). This doc maps those brand tokens onto the portal's CSS variables (`app/globals.css`) so the marketing site and the client portal stay visually consistent.

To change colors or branding anywhere in the portal, edit the variables in `app/globals.css` — every component reads from these via Tailwind utility classes (`bg-primary`, `text-muted-foreground`, etc.) or `var(--token)` in inline styles. You should not need to touch individual component files for a palette change.

---

## 1. Color Tokens

The portal is dark-first (`defaultTheme="dark"` in `app/layout.tsx`), with a light theme available via the header's theme toggle.

### Dark theme (`.dark` in globals.css)

| Token | Value | Maps to website token | Usage |
|---|---|---|---|
| `--background` | `#0D111A` | `--void` | Page background |
| `--card` | `#141926` | `--deep` | Standard card / surface background |
| `--popover` | `#1D2333` | `--elevated` | Elevated surfaces, hover states on rows |
| `--foreground` | `#E2E8F0` | `--text` | Default body/heading text |
| `--muted-foreground` | `#94A3B8` | `--muted` | Secondary text, labels, captions |
| `--subtle` | `#64748B` | — (portal-specific) | Tertiary text, placeholders, disabled icons |
| `--border` / `--line` / `--input` | `#2A303F` | `--line` | Dividers, table rows, card borders, input borders |
| `--primary` | `#3366FF` | `--blue` | Buttons, active nav state, focus rings, links |
| `--primary-hover` | `#4D7CFF` | `--blue-hover` | Hover state for primary buttons/links |
| `--primary-foreground` | `#FFFFFF` | — | Text on primary-colored buttons |
| `--secondary` / `--accent` | `#1D2333` | `--elevated` | Secondary surfaces, hover backgrounds |
| `--destructive` | `#EF4444` | `--red` | Delete/error actions |
| `--destructive-hover` | `#DC2626` | — (darker red) | Hover state for destructive buttons |
| `--success` | `#10B981` | `--green` | Success / synced status only |
| `--warning` | `#F59E0B` | `--amber` | Warning / pending status only |

### Light theme (`:root`)

The website skill doesn't define a light theme, so the portal's light mode follows the same blue-accent brand logic on white/slate surfaces: white background and cards, `#0D111A` text, `#3366FF` primary, slate-200 (`#E2E8F0`) borders, and the same green/amber/red semantic colors.

### Color usage rules (carried over from the website skill)

- **Blue (`--primary`) is the only brand accent.** Use it for buttons, active states, links, and focus rings.
- **Green / amber / red are semantic only** — success, warning, and error/destructive states. Never use them for decoration, branding, or to highlight non-status content.
- **`--foreground` is the default** for all text. `--muted-foreground` is for secondary text (labels, metadata). `--subtle` is for tertiary text (placeholders, disabled states, "x more" counters).
- **`--border` / `--line` / `--input`** currently share one value (`#2A303F` dark / `#E2E8F0` light). They're kept as separate variables so a future "elevated card needs a more visible border" treatment can diverge from standard dividers without a find-and-replace.

### How to change the brand color

To swap the accent from blue to something else, change exactly two values in `app/globals.css`: `--primary` and `--primary-hover` (in both `:root` and `.dark`). Everything else — buttons, focus rings, active nav links, form focus states — follows automatically because components reference the token, not a hardcoded hex value.

---

## 2. Typography

- **Font:** Inter (already loaded via `next/font/google` in `app/layout.tsx`, matches the website).
- Component-level type styling currently follows Tailwind defaults rather than the website's fixed H1/H2/H3 scale, since the portal is a data/app surface rather than a marketing page. If marketing-style headers are ever needed inside the portal (e.g. an empty-state hero), reuse the website's scale: H1 `52px/800`, H2 `36px/800`, H3 `18px/800`, body `14px/400`.

---

## 3. Component Patterns Already in Place

- **Buttons:** `border-radius: 0.5rem` (8px, via the `--radius` token), primary fill uses `--primary` / `--primary-hover`, destructive uses `--destructive` / `--destructive-hover`. Secondary/outline buttons are transparent with a `--border` outline.
- **Cards / table containers:** `--card` background, `1px solid var(--border)`, `rounded-xl`.
- **Status badges** (`components/ui/StatusBadge.tsx`): translucent tinted backgrounds at the same opacity (`0.14` fill / `0.3` border) for all three states — green=synced, amber=pending, red=error. This is the canonical pattern for any future status indicator; reuse the same opacity values for consistency.
- **Modals** (`components/ui/Modal.tsx`): `--card` background, `--border` outline, centered overlay at `rgba(0,0,0,0.6)` with blur.
- **Form inputs** (`components/consultants/ConsultantForm.tsx`): `--background` fill, `--border` outline, `--primary` focus ring (`0 0 0 2px var(--primary)`).

---

## 4. What Changed From the Previous Setup

The portal previously used an amber/orange (`#F59E0B`) accent that didn't match the website's blue/green brand, plus a large number of hardcoded hex colors scattered across components (inline `style={{ color: '#F8F9FA' }}` etc.) instead of theme tokens. This pass:

1. Replaced the amber accent with the website's blue (`#3366FF` / `#4D7CFF` hover) across all primary buttons, focus states, active nav links, and form controls.
2. Aligned the dark theme's background/surface/text scale to the website's void/deep/elevated/text/muted/line tokens.
3. Added explicit `--success` / `--warning` / `--destructive-hover` / `--primary-hover` / `--subtle` tokens so semantic and brand colors are no longer conflated (the old setup reused the amber primary color for both branding and "pending" status).
4. Converted hardcoded hex values in `ZipTag`, `Modal`, `StatusBadge`, `ConsultantForm`, `ConsultantTable`, `DeleteModal`, the consultants page, billing page, and login page to reference the CSS variables above, so future palette edits only require touching `globals.css`.

**Left unchanged (out of scope):** the categorical tag colors in `BillingClient.tsx` (`OUTCOME_COLORS` / `STATUS_COLORS` — amber/blue/purple/teal/rose used to visually distinguish outcome *types* like "Sit Appointment" vs "Referral"). These are functional category labels, not brand decoration, so per the website skill's rule that semantic colors aren't used for decoration, they were left as their own independent Tailwind palette rather than forced onto the green/amber/red status tokens.

---

## 5. Page Registry

| Page | Notes |
|---|---|
| `/login` | Primary button now blue; logo badge uses `--primary` text. |
| `/billing` | Toggle pills, focus rings, and "Manage Billing" CTA use `--primary`/`--primary-hover`. Outcome/status pill colors unchanged (see §4). |
| `/consultants` | Add Consultant button, table action-button hover colors, form inputs, toggle switch, zip tags, delete-confirmation modal all moved to tokens. |
| `/dashboard`, `/reps` | Placeholder pages, already token-based (`bg-card`, `text-foreground`, etc.) — no changes needed. |
| Sidebar / TopBar / PortalShell | Already used Tailwind semantic classes (`bg-primary`, `border-border`) — pick up the new palette automatically, no edits required. |
