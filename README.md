# ChunkPreClaimEvent

ChunkPreClaimEvent is a visual planning aid for the “claim a grid neighborhood” workflow. The left pane is a big grid where you build shapes, while the right pane shows the rule set, options, and contextual messaging that drive the planner.

## Running

You can launch the experience in two ways:

1. Double-click `index.html` for a quick local preview without a server.
2. Start a static file server, which is useful for sharing a live preview:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/index.html` in your browser.

## Directory layout

- `index.html`: HTML shell that wires the CSS and module scripts together.
- `styles.css`: Styling for the grid, controls, and layout panels.
- `src/main.js`: Application entry point—wires DOM events, bootstraps the initial state, and launches the render loop.
- `src/state.js`: Centralized state container with default toggle values and helpers for reading or mutating rule flags.
- `src/render.js`: Grid rendering logic plus the geometry (chunk) calculations that drive the planner visuals.
- `src/rules.js`: Rule definitions that decide whether a prospective claim is allowed; these are also the hooks that power the toggles in the sidebar.
- `src/metrics.js`: Shared utilities for perimeter, diameter, and other shape metrics.
- `src/utils.js`: Grid helpers such as neighbor lookup, coordinate conversions, and overlap checks.

## Module breakdown

- **`index.html`** stays minimal, loading the CSS and each module as separate scripts so you can tweak any module independently.
- **`styles.css`** styles the two-panel layout (grid on the left, rule controls on the right) and defines the look of claimed cells, tooltips, and notifications.
- **`src/main.js`** orchestrates the UI: it binds pointer and keyboard events, keeps the default state in sync with `src/state.js`, and triggers `src/render.js` to redraw whenever something changes.
- **`src/state.js`** exports the default state, exposes helpers to reset or update the rule toggles, and keeps track of the currently hovered/selected grid cell for rendering.
- **`src/render.js`** performs the actual rendering and chunk-aggregation calculations. It reads the current state, applies the rules from `src/rules.js`, and carries the geometry information into the display layer.
- **`src/rules.js`** contains the `defaultCanClaim` logic and all of the built-in rule modules that drive the sidebar toggles:
  - *Double-adjacent threshold (B)*: require a candidate cell to be edge-adjacent to at least two existing claimed cells.
  - *Neighborhood support gate (J/24)*: ensure the cell is surrounded by a supporting ring of previously claimed tiles before allowing expansion.
  - *Arm-length limit (C)*: restricts how far extensions can grow along a single direction (arm length must stay under `L`).
  - *Shape tightness cap (D: P/A)*: prevents thin shapes from evading other limits by capping the perimeter-to-area ratio.
  - *Diameter limit (I: D)*: bounds the maximum distance between the farthest two cells in a shape.
  - *Endpoint count limit (E)*: caps the number of degree-1 nodes (cells with only one adjacent claimed neighbor).
  - *Hole prevention (F)*: forbids creating isolated pockets that are not connected to the claimed area.
  - *Exterior fill ratio floor (G: A/L²)*: limits the external area-to-length ratio (`L` equals the width of the bounding square).
  - *Interior fill ratio floor (H: Lin²/A)*: guards against overly sparse interiors by requiring a minimum ratio of the largest filling square to the claimed area.
- **`src/metrics.js`** exports helpers for computing lengths, diameters, and other measurements that rules rely on—this keeps the rule definitions focused on policy, not math.
- **`src/utils.js`** provides reusable helpers (grid neighbor iteration, coordinate clamping, claim set sorting) so every module can stay compact.

## Customizing the logic

- If you want to tweak how the planner decides whether a cell can be claimed, edit `src/rules.js` and adjust `defaultCanClaim` or the individual gate implementations.
- The sidebar toggles simply flip flags inside `src/state.js`, so updating a toggle instantly re-evaluates the rules without reloading the page.
