# AEGIS — Community Map Enhancements
*Feature spec for Kiro (Requirements-First format). Covers: fault-line visualization, dark topographic map theme, live user presence, and open/public visibility of posts.*

## Context (for Kiro — read before planning)
AEGIS is an existing earthquake-safety web app (React + Vite, Leaflet.js for mapping). The Community Map screen already has a toolbar with **Satellite** (base-layer toggle) and **Sharing...** (location-sharing control, currently shows "0 people sharing location" — the UI exists but isn't wired to live data yet). This spec adds a **Quakes** button next to them, restyles the default map theme, makes the Sharing feature actually show other users, and makes all community posts globally visible. Build on the existing toolbar/layer-switching pattern — do not replace it.

---

## requirements.md

### Requirement 1 — Fault Line Visualization ("Quakes" button)
**User Story:** As a resident, I want to see nearby active fault lines on the map, so I can understand my earthquake risk at a glance.

1.1 WHEN the user clicks the **Quakes** button in the Community Map toolbar, THE SYSTEM SHALL toggle a fault-line overlay on top of the current base map.
1.2 WHEN the fault-line overlay is enabled, THE SYSTEM SHALL render all active fault line geometries for the Philippines, sourced from DOST-PHIVOLCS (see design.md for the exact endpoint).
1.3 WHEN the user taps/hovers a rendered fault line, THE SYSTEM SHALL show a popup with the fault segment's name/classification if present in the source data, or a generic "Active Fault" label if not.
1.4 WHEN fault-line data fails to load (network/API error), THE SYSTEM SHALL show a brief non-blocking error state and leave the rest of the map fully usable.
1.5 WHEN the Quakes overlay is active, THE SYSTEM SHALL visually highlight the Quakes button (filled/active state), matching the existing active-state styling already used for the Satellite toggle.
1.6 THE SYSTEM SHALL cache the fault-line dataset locally (not re-fetch from PHIVOLCS on every toggle or every page load) — see design.md for caching approach.

### Requirement 2 — Dark Topographic / Outdoor Map Theme
**User Story:** As a user, I want the default map to look like a dark outdoor/topo map, so fault lines, hazard pins, and user markers are easy to read at a glance, especially in low light.

2.1 WHEN the Community Map first loads, THE SYSTEM SHALL render the base map using a dark topographic ("outdoor/terrain") tile theme by default, instead of the current satellite default.
2.2 WHEN the user clicks **Satellite**, THE SYSTEM SHALL switch the base layer to the existing Esri satellite imagery, preserving the current pan position and zoom level.
2.3 WHEN the user switches back off Satellite, THE SYSTEM SHALL return to the dark topographic theme.
2.4 WHEN both the dark topo theme and the Quakes overlay are active at the same time, THE SYSTEM SHALL render fault lines in a high-contrast accent color (red/orange) so they stay legible against the dark background.
2.5 THE SYSTEM SHALL keep all existing UI chrome (glass toolbar, sidebar) visually consistent against the new dark base layer — verify text/icon contrast isn't lost against the darker map.

### Requirement 3 — Live User Presence on the Map
**User Story:** As a user who has opted into location sharing, I want to see every other sharing user's profile icon on the map, so the community can track each other during an emergency.

3.1 WHEN a user enables the existing **Share Location** control, THE SYSTEM SHALL begin periodically publishing that user's current coordinates to the backend.
3.2 WHEN any user has an active, recently-updated shared location, THE SYSTEM SHALL render that user's profile picture as a marker at their coordinates, visible on every other user's Community Map — not just their household or contacts.
3.3 WHEN a user's last location update is older than a defined staleness threshold (recommend 5 minutes), THE SYSTEM SHALL fade or remove their marker, so stale positions are never shown as live.
3.4 WHEN the user taps another person's marker, THE SYSTEM SHALL show a popup with that person's name, profile photo, and "last updated" time.
3.5 WHEN a user disables location sharing, THE SYSTEM SHALL remove their marker from all other users' maps within one refresh cycle.
3.6 WHILE one or more users are actively sharing, THE SYSTEM SHALL update the **Sharing...** button/label to reflect the live count (replacing the static "0 people sharing location").
3.7 THE SYSTEM SHALL refresh other users' positions on an interval (recommend every 10–15 seconds) without requiring a manual page reload.

### Requirement 4 — Open, App-Wide Visibility of Posts
**User Story:** As a resident of an open community safety app, I want every hazard report and announcement to be visible to everyone, so no one misses safety-critical information meant for the whole community.

4.1 WHEN any user submits a Hazard Report, THE SYSTEM SHALL make it visible to every user of the app — not scoped to the author's household, contacts, or any other private group.
4.2 WHEN a Hazard Report includes a location, THE SYSTEM SHALL plot it as a pin on the Community Map, visible to all users.
4.3 WHEN any user (or admin) publishes an Announcement, THE SYSTEM SHALL make it visible app-wide, following the same open-visibility rule as Hazard Reports.
4.4 THE SYSTEM SHALL NOT apply any per-user, per-household, or per-contact-list privacy filter to the read/list queries for Hazard Reports or Announcements.
4.5 IF a privacy/visibility filter currently exists on these queries (left over from an earlier household-scoped design), THEN THE SYSTEM SHALL remove it as part of this feature.

---

## design.md

### Architecture overview
No new services are introduced. This extends the existing React + Leaflet Community Map component with: one new tile/overlay layer (fault lines), one new base-layer option (dark topo), a live-presence data feed (location shares), and a visibility fix on two existing entities (Hazard Reports, Announcements).

```
Browser (React + Leaflet map component)
  ├─ Base layer switcher: [Dark Topo (default)] ⇄ [Esri Satellite (existing)]
  ├─ Quakes overlay: GeoJSON fault-line layer (toggleable, independent of base layer)
  ├─ Presence layer: markers from LocationShare records (polled)
  └─ Hazard pins layer: markers from HazardReport records (already-existing entity, visibility fix only)
        ↓ reads/writes
  Backend (existing Base44/data layer)
  ├─ LocationShare entity (new — see data model below)
  ├─ HazardReport entity (existing — remove private-scoping on list query)
  └─ Announcement entity (existing — remove private-scoping on list query)
```

### Map theme — tile source recommendation
Two options; build Option A first since it needs no API key or sign-up:

**Option A (recommended default): CartoDB Dark Matter + Esri Hillshade Dark**
- Base layer: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` — free, no key, clean dark basemap.
- Overlay pane (adds the "topo" relief on top of the dark base): Esri `World_Hillshade_Dark` service (`https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade_Dark/MapServer`) — free, no key, gives terrain shading without needing a full colored topo tileset.
- Combine both as stacked Leaflet tile layers; this is the fastest path to "black but topo" with zero signup friction.

**Option B (richer topo detail, needs a free API key): Thunderforest "Outdoors" / "Atlas"**
- More visible elevation contours and trail detail, styled for outdoor use.
- Requires a free Thunderforest API key (generous free tier) — use this if Option A's relief shading feels too subtle once implemented and tested.

Implement both as selectable constants so swapping later is a one-line change, not a rewrite.

### Fault line data source
**Primary (live):** DOST-PHIVOLCS official ArcGIS REST service —
```
https://gisweb.phivolcs.dost.gov.ph/arcgis/rest/services/PHIVOLCS/ActiveFault/MapServer/0/query?where=1=1&outFields=*&f=geojson
```
This is the Philippine government's own active-fault layer (EPSG:4326 / lat-lng, covers the whole archipelago). Query it once, then **cache the GeoJSON response** (store as a static asset or in your backend storage, refreshed periodically e.g. monthly — fault lines don't move) rather than hitting PHIVOLCS's server on every app load. This satisfies Requirement 1.6 and is good practice for a public government endpoint.

**Fallback (offline/backup):** Humanitarian Data Exchange mirrors a PHIVOLCS active-faults dataset as a KMZ (`Distribution of Active Faults in the Philippines_Mar2019.kmz`, via data.humdata.org). Convert to GeoJSON once (e.g. with `togeojson` or QGIS) and bundle it as a static fallback asset in case the live ArcGIS endpoint is ever unreachable.

### Live presence (Requirement 3) — data model
New entity, `LocationShare`:
| field | type | notes |
|---|---|---|
| id | string/uuid | PK |
| user_id | string | FK to the existing user/profile entity |
| lat | number | current latitude |
| lng | number | current longitude |
| updated_at | datetime | last ping; used to compute staleness (3.3) |
| is_sharing | boolean | explicit opt-in/out flag, toggled by the existing Share Location control |

**Frontend:** use the browser's Geolocation `watchPosition` API while `is_sharing` is true, push an update to this entity every ~15–30 seconds (don't spam on every tiny GPS jitter).
**Other clients:** poll the full `LocationShare` list (filtered to `is_sharing = true` and `updated_at` within the staleness window) every 10–15 seconds, render one marker per record using that user's existing profile picture as a custom Leaflet `divIcon` (circular avatar, small "live" ring) instead of a default pin.
**Staleness (3.3):** either filter stale rows out of the poll query directly, or fetch all and fade/remove client-side if `now - updated_at > 5 minutes` — either is fine, pick whichever is simpler given your existing query helpers.
**Upgrade path:** if the backend supports realtime subscriptions (check what the existing data layer offers before building a custom poller from scratch), prefer that over polling — same data model, just a push instead of pull.

### Open visibility (Requirement 4)
This is a **fix, not a new feature** — locate the existing list/query logic for `HazardReport` and `Announcement` (likely already powering the Hazard Reports and Announcements sidebar pages) and remove any filter scoping results to the current user's household, contacts, or ownership. Confirm the create/write side still records `author_id` (for attribution and the audit trail) — only the *read* scope changes, not who gets credited for a post.

### Sequence — Quakes button click
```
User clicks Quakes
  → if fault-line GeoJSON not yet cached client-side:
       fetch from local cache/asset (not live PHIVOLCS call)
  → toggle fault-line Leaflet layer visibility
  → toggle button active-state styling
  → (no change to base layer or other overlays)
```

---

## tasks.md

- [ ] **Task 1 — Dark topo base layer** (Req 2)
  Implement Option A (CartoDB Dark Matter + Esri Hillshade Dark) as the new default base layer; wire it into the existing Satellite toggle so it becomes a true A/B switch between the two base layers, preserving pan/zoom on switch.
  _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] **Task 2 — Fault line data pipeline** (Req 1)
  Fetch the PHIVOLCS ArcGIS GeoJSON once, cache it as a static asset/backend-stored file; build the fallback-to-HDX-KMZ path only if time allows.
  _Requirements: 1.2, 1.4, 1.6_

- [ ] **Task 3 — Quakes toggle + fault-line layer** (Req 1)
  Add the Quakes button to the toolbar (matching Satellite's visual pattern), render the cached GeoJSON as a Leaflet overlay, tappable popups, active-state styling, high-contrast color against the dark theme.
  _Requirements: 1.1, 1.3, 1.5, 2.4_

- [ ] **Task 4 — LocationShare data model + geolocation watcher** (Req 3)
  Create the `LocationShare` entity; wire the existing Share Location control to start/stop `watchPosition` and push periodic updates.
  _Requirements: 3.1, 3.5_

- [ ] **Task 5 — Presence markers + live Sharing count** (Req 3)
  Poll other users' active LocationShare records, render avatar markers with staleness fade/removal, popup on tap, and update the "Sharing..." button to show the live count instead of the static "0 people."
  _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7_

- [ ] **Task 6 — Remove privacy scoping from Hazard Reports & Announcements** (Req 4)
  Audit and fix the existing list queries; confirm with two test accounts that each can see the other's posts.
  _Requirements: 4.1, 4.3, 4.4, 4.5_

- [ ] **Task 7 — Hazard Report pins on Community Map** (Req 4)
  Plot existing Hazard Report locations as pins on the same map used for fault lines and presence markers.
  _Requirements: 4.2_

- [ ] **Task 8 — QA pass**
  Verify: Quakes toggle on/off with no base-layer side effects; dark topo ⇄ satellite switch preserves view; two separate test accounts can see each other's location marker and posts; stale markers disappear after ~5 minutes; graceful behavior when PHIVOLCS fetch fails.
  _Requirements: all_
