# Button Glassmorphism + Claymorphism Redesign - Requirements

## Feature Overview
Redesign ALL buttons and interactive elements across the AEGIS earthquake safety application with a premium glassmorphism + claymorphism design system that ensures perfect font color harmony and gives special vibrant treatment to Emergency SOS elements.

## Current State
- Buttons have basic claymorphism with dual shadows  
- Font colors are functional but don't fully blend with design
- Emergency SOS doesn't stand out enough as critical feature
- Sidebar navigation lacks glass effects
- Inconsistent button styling across pages

## Desired State
- All buttons use glassmorphism (frosted glass with backdrop blur) + claymorphism (dual clay shadows)
- Font colors perfectly blend with glass/clay backgrounds
- Emergency SOS has vibrant, pulsing design that feels urgent
- Sidebar navigation has smooth glass transitions
- Consistent premium design language across entire app

## Scope - Components to Redesign

### 1. Base Button Component (`src/components/ui/button.jsx`)
- Default variant (blue gradient)
- Destructive variant (rose/red gradient)
- Outline variant (light clay with glass)
- Secondary variant (slate clay with glass)
- Ghost variant (transparent with glass on hover)
- Link variant (styled text)
- Success variant (emerald gradient)
- Warning variant (amber gradient)

### 2. Sidebar Navigation (`src/components/AppLayout.jsx`)
- Regular nav items: Dashboard, My Household, Emergency Contacts, AI Assistant, Community Map, Hazard Reports, Announcements, Profile
- **Emergency SOS nav item** (vibrant rose with badge)
- Active/inactive states with glass effects
- Sign out button

### 3. Emergency SOS Page (`src/pages/SOS.jsx`)
- **Main SOS button** (large circular, vibrant pulsing) - CRITICAL
- "I'm safe now" button (emerald success)
- "Call 911 directly" button (outline with rose)
- Confirmation dialog buttons

### 4. Community Map Controls (`src/pages/CommunityMap.jsx`)
- Quakes toggle button
- Faults toggle button
- Map style selector buttons
- Follow/Find Me button
- Share/Update location button
- Avatar edit button

### 5. AI Assistant (`src/pages/Assistant.jsx`)
- Send message button
- Suggestion prompt buttons

### 6. Dialog Components (`src/components/ui/dialog.jsx`)
- All dialog action buttons
- Confirmation dialogs
- Alert dialogs

### 7. Form Buttons (all pages)
- Submit buttons
- Cancel buttons
- Add/Create buttons
- Edit/Delete buttons

## Design System Specifications

### Glassmorphism
```css
background: rgba(255,255,255,0.3) to rgba(255,255,255,0.6)
backdrop-filter: blur(12px) saturate(150%)
border: 1px solid rgba(255,255,255,0.4)
border-radius: 16px (rounded-2xl) minimum
```

### Claymorphism Shadow System
**Raised (default):**
```
shadow-[8px_8px_16px_rgba(0,0,0,0.12),-4px_-4px_12px_rgba(255,255,255,0.9)]
```

**Hover:**
```
shadow-[12px_12px_24px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.95)]
translateY(-2px)
```

**Active/Pressed:**
```
shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]
translateY(1px)
```

### Font Color Requirements ⚠️ CRITICAL

| Button Type | Background | Text Color | Hex |
|------------|------------|------------|-----|
| Primary (blue) | Blue gradient | White | #ffffff |
| Secondary/Outline | Light glass/clay | Slate-700/800 | #334155 / #1e293b |
| Emergency SOS | Rose-600 gradient | White | #ffffff |
| Success | Emerald-600 gradient | White | #ffffff |
| Destructive | Rose-600 gradient | White | #ffffff |
| Ghost | Transparent | Slate-700 → 900 | #334155 → #0f172a |
| Sidebar inactive | Transparent | Slate-400 | #94a3b8 |
| Sidebar active | Glass white/10 | White | #ffffff |
| SOS nav item | Transparent | Rose-300 | #fda4af |

### Emergency SOS Button - Special Requirements 🚨

**Size:** `h-56 w-56` (224px x 224px circular)

**Design:**
```
- Background: gradient rose-600 to rose-700
- Pulsing ring: animate-ping, rose-500/30
- Shadow: shadow-2xl shadow-rose-600/40
- Icon: Siren h-14 w-14, white
- Text: "SOS" 2xl font-bold tracking-wider, white
- Subtext: "Tap to alert" xs uppercase tracking-widest, rose-100
- Hover: scale-105, bg-rose-700
- Active: scale-95
- Transition: all 300ms
```

### Sidebar Navigation Requirements

**Inactive Items:**
- Text: slate-400
- Background: transparent
- Hover: bg-white/5, glass effect
- Transition: 300ms

**Active Items:**
- Text: white
- Background: glass-frosted (bg-white/10)
- Shadow: clay raised
- Icon background: rounded-lg bg-white/5, h-8 w-8

**Emergency SOS Nav Item:**
- Text: rose-300
- Badge: "SOS" rose-500/20 bg, rose-300 text
- Pressed: ring-2 ring-rose-400

## Button Interaction States

| State | Effect |
|-------|--------|
| Default | Raised clay shadows, glass background |
| Hover | Enhanced shadows, translateY(-2px) |
| Active | Inset shadows, translateY(1px) |
| Focus | ring-2 ring-blue-400 ring-offset-2 |
| Disabled | opacity-50, pointer-events-none |
| Loading | Spinner icon, animate-spin |

## Accessibility Requirements

- Minimum touch target: **44x44px**
- Color contrast ratio: **4.5:1 minimum**
- Focus indicators: **visible and clear**
- ARIA labels: **for icon-only buttons**
- Keyboard navigation: **full support**
- Screen reader: **friendly announcements**

## Technical Constraints

- Use **Tailwind CSS** utility classes
- Maintain existing `button.jsx` component structure
- Use `cva` (class-variance-authority) for variants
- All transitions: `duration-300`
- Support `React.forwardRef` for button component
- No custom CSS unless absolutely necessary

## Acceptance Criteria

✅ All buttons have glassmorphism background with backdrop blur
✅ All buttons have claymorphism dual shadows
✅ Font colors are perfectly readable and blend with design
✅ Emergency SOS button is vibrant, pulsing, and feels urgent
✅ Sidebar navigation has smooth glass transitions
✅ All button states (hover, active, disabled, focus) work correctly
✅ Design is consistent across all pages
✅ Accessibility standards met (WCAG 2.1 Level AA)
✅ No regressions in functionality
✅ Responsive design works on mobile, tablet, and desktop

## Success Metrics

- Visual consistency: 100% (all buttons match design system)
- User feedback: Positive response to new design
- Accessibility audit: No violations
- Performance: No frame drops during animations (60fps)

## Out of Scope

- Input fields (already styled)
- Card components (already styled)
- Badges (already styled)
- Other non-button UI elements

## Next Steps

1. Review and approve requirements
2. Create design document with exact Tailwind classes
3. Create task breakdown
4. Implement button.jsx base component
5. Update AppLayout sidebar
6. Update SOS page
7. Update remaining components
8. Test accessibility
9. Verify on all devices
