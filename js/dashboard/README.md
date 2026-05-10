# DegreePilot AI — dashboard modules (v2)

Front-end-only prototype. Landing/marketing pages live at the site root; **only this folder + `dashboard.html`** implement the signed-in experience.

| File | Role |
|------|------|
| `core.js` | IDs/dates/HTML escape; announcement/syllabus/screenshot/audio **simulations**; grade & what-if math; study-plan text generation; email draft templates. |
| `main.js` | Loads/saves state via `DegreePilotStorage`, renders all tabs, binds forms, coordinates cross-tab updates. |

**State schema** is defined by `buildBlankState()` / `buildSampleState()` in `../seed.js`. Persistence uses `localStorage` key `degreepilot_dashboard_v2` (`../storage.js`).

**Reference visuals:** PNGs in `/assets/dashboard-ref/` (exported UI mocks — layout follows these patterns).
