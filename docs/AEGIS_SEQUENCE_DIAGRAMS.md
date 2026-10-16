# AEGIS: Complete Application Sequence Flow

This diagram illustrates the complete, continuous end-to-end journey of the AEGIS platform as a single cohesive process incorporating all core features.

> **💡 Quick Export:**  
> Open [`docs/aegis_sequence_diagrams.html`](file:///c:/Users/flean/Documents/aegis-full/docs/aegis_sequence_diagrams.html) or navigate to [http://localhost:5175/aegis_sequence_diagrams.html](http://localhost:5175/aegis_sequence_diagrams.html) to download this diagram as a high-resolution **PNG**, vector **SVG**, or print it as a **PDF** with one click.

---

```mermaid
sequenceDiagram
    autonumber

    actor Citizen as 👤 Citizen
    participant App as 📱 AEGIS App
    participant Storage as 💾 Offline Storage
    participant Backend as ☁️ Base44 Backend
    participant AI as 🧠 AI Disaster Assistant
    participant Phone as 📞 Native Phone Dialer
    actor DRRMO as 🛡️ DRRMO & Volunteers

    Note over Citizen, DRRMO: Preparedness & Household Readiness
    Citizen->>App: Sets up Emergency Contacts & Medical Info in Profile
    App->>Storage: Cache emergency contacts, hotlines & Knowledge Hub offline
    App->>Backend: Sync profile & household members
    Citizen->>App: Completes Risk Assessment & verifies Go-Bag Checklist
    Citizen->>App: Schedules community evacuation drill in Drill Scheduler

    Note over Citizen, DRRMO: Early Warning & AI Disaster Advisory
    DRRMO->>Backend: Broadcasts calamity alert & updates Infrastructure Status
    Backend-->>App: Push notification & update Announcements feed
    App-->>Citizen: Alert: "Severe Weather Warning & Lifeline Disruptions"
    Citizen->>App: Consults Assistant ("Storm surge safety protocols")
    App->>AI: Evaluate query with local disaster context (Gemini / Offline fallback)
    AI-->>App: Return immediate safety instructions & emergency advice
    App-->>Citizen: Display tailored guidance with 1-click hotline call buttons

    Note over Citizen, DRRMO: Citizen Hazard Reporting & Community Map
    Citizen->>App: Submits localized street flood with GPS & photo in Hazard Reports
    App->>Backend: Submit citizen hazard report
    DRRMO->>Backend: Reviews & verifies incident in Moderation Queue
    Backend-->>App: Update Community Map with interactive verified hazard marker

    Note over Citizen, DRRMO: Evacuation Locator & Emergency SOS
    Citizen->>App: Checks Evacuation Locator for nearest open shelter route
    App->>Backend: Fetch real-time shelter capacity, amenities & safe routes
    Backend-->>App: Return nearest evacuation center with live navigation
    Citizen->>App: Triggers Emergency SOS (or 3-sec quick countdown)
    App->>Backend: Dispatch live GPS distress beacon (status: ACTIVE)
    Backend-->>DRRMO: Sound critical audible distress alarm & pin location on console

    Note over Citizen, Phone: Direct Cellular Phone Call
    App->>Storage: Retrieve primary emergency contact / 911 hotline
    Storage-->>App: Return formatted phone number
    App->>Phone: Execute direct call via window.location.href = "tel:0917XXXXXXX"
    Phone-->>Citizen: Launch OS phone dialer with pre-dialed contact / hotline
    Citizen->>DRRMO: Connected via direct voice call for immediate rescue

    Note over Citizen, DRRMO: Evacuation, Volunteer Relief & Recovery
    Citizen->>App: Arrives at shelter & submits Household Check-In (Headcount & Needs)
    App->>Backend: Sync family safety status, elderly/infant counts & medical flags
    Backend-->>DRRMO: Update real-time Shelter Roster & Relief Distribution Analytics
    DRRMO->>App: Mobilize teams via Volunteer Coordination for food & medical aid
    Citizen->>App: Uploads property photos to Damage Vault for calamity claims
    Backend-->>Citizen: Track government relief & aid status in Recovery Tracker
```
