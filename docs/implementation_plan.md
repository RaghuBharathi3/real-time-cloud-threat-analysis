# Frontend Redesign Plan (Cloud Security Operations Console)

Audit, redesign, and polish the user interface. We will replace the bubbly, template-style AI aesthetic with a professional, high-density **Security Operations Console** inspired by production tools like Splunk, Datadog, and AWS CloudTrail.

---

## Design System & Styling Tokens

We will implement a rigorous design system in [`index.css`](file:///c:/Users/Windows/Documents/cloud/frontend/src/index.css) using CSS variables:

### 1. Typography
* **Primary Typeface**: **IBM Plex Sans** (300, 400, 500, 600, 700) for UI elements, labels, and copy.
* **Monospace Typeface**: **IBM Plex Mono** (400, 500, 600) for IDs, IP addresses, JSON blobs, and tabular numbers.
* **Font Sizes**: Strict scale ranging from 11px (meta text) to 20px (dashboard headings) to avoid oversized headings.

### 2. Color Palette (Steel Security Operations Theme)
* **Background**: Clean dark slate (`#0b0f19`) to keep contrast high but glare low.
* **Surfaces & Panels**: Solid dark navy (`#121b2e`) and steel-gray (`#1e293b`).
* **Borders & Rules**: Low-contrast borders (`#334155`) for structural hierarchy.
* **Alert States**:
  * **Normal/Safe**: Muted forest green (`#059669` / `#10b981`)
  * **Warning**: Amber orange (`#d97706` / `#f59e0b`)
  * **Critical/Suspicious**: Crimson red (`#e11d48` / `#f43f5e`)
  * **Accent/Info**: Steel blue (`#0284c7` / `#38bdf8`)

### 3. Spacing, Radii & Shadows
* **Radii**: Restricted to `4px` and `6px` for a precise, sharp, professional look (replacing `16px` rounded corners).
* **Borders**: Sharp `1px solid` border rules. No heavy box shadows or decorative gradients.
* **Padding & Margins**: Strict 8px grid alignment (8px, 12px, 16px, 24px).

---

## User Review Required

> [!IMPORTANT]
> * **Layout Transformation**: We are migrating from a sequential card-based design to a **split-pane console layout** (Sidebar for stream/simulate controls and logs, main center panel for deep log inspection, bottom panel for ML model metrics).
> * **Tabular Display**: Ingested events will be displayed as high-density tabular rows (similar to command-line outputs or server logs), rather than separate cards.

---

## Proposed Changes

### Frontend Components

#### [MODIFY] [index.css](file:///c:/Users/Windows/Documents/cloud/frontend/src/index.css)
* Set up Google Fonts import for `IBM Plex Sans` and `IBM Plex Mono`.
* Define layout utility classes: `console-grid`, `split-pane`, `terminal-log-row`, and form control states.
* Remove blurry glassmorphism variables, bubble shadows, and heavy rounded card borders.

#### [MODIFY] [App.jsx](file:///c:/Users/Windows/Documents/cloud/frontend/src/App.jsx)
* Implement the new **Split-Pane Operations Console Layout**:
  * **Left Side**: Simulation controls (Start/Pause, Inject button) and scrolling terminal event list.
  * **Right Side / Main View**: Deep-dive investigator panel showing selected event attributes (Module 1), numeric engineered features (Module 2), and machine learning predictions with explanation points (Module 3).
  * **Bottom Drawer / Collapsible Bar**: Model evaluation metrics and feature importance bars.
* Implement proper interactive states:
  * Loading state spinner on model train button.
  * Tab transition animations.
  * Empty state diagnostics showing help tips.
  * Accessible keyboard focus outlines and explicit semantic HTML tags.

#### [MODIFY] [index.html](file:///c:/Users/Windows/Documents/cloud/frontend/index.html)
* Update `<title>` to "Cloud Security Assistant Console".
* Remove default Vite icon and reference favicon.

---

## Verification Plan

### Manual Verification
1. Verify console renders correctly in landscape desktop (main view) and collapses down to stacked blocks on mobile screen sizes.
2. Check that simulation, custom injection, and model training flows are fully functional.
3. Check browser console logs for any React key or style validation warnings.
