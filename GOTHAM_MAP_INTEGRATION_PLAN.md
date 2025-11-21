# GOTHAM MAP INTEGRATION - MASTER PLAN
**Project**: Integrate 3D Gotham City Map into Zarvânex with AI-Powered Routing

---

## PROJECT OVERVIEW

Integration of a Three.js-based 3D Gotham City map into Zarvânex (Persian-aesthetic LLM interface) with intelligent routing capabilities where users can ask Claude for directions and see them visualized in real-time on the 3D map.

### Current Status
- ✅ **Basic Integration Complete**: Map accessible via iframe at sidebar button
- ⏳ **Advanced Features Pending**: React component, pathfinding, Claude AI integration

### Tech Stack
- Next.js 15+ with App Router
- TypeScript
- Three.js for 3D visualization
- Tailwind CSS
- Color scheme: Teal/cyan (#14b8a6) - Persian geometric aesthetic
- Dark theme: #0a0a0a background

---

## PHASE 1: UI/UX DESIGN & INTEGRATION (~1 hour)

### Objectives
Convert standalone HTML map to proper React component integrated with Zarvânex aesthetic.

### Tasks

#### Task 1.1: Create Map Page Route (5 min)
**File**: `/app/gotham-map/page.tsx`

**Requirements**:
- Full-screen layout with dark background
- Header with Zarvânex branding
- Smooth transitions from main app
- Responsive design (desktop priority)

**Implementation**:
```typescript
import GothamMapViewer from '@/components/gotham/GothamMapViewer';

export default function GothamMapPage() {
  return (
    <div className="h-screen w-screen bg-[#0a0a0a]">
      <GothamMapViewer />
    </div>
  );
}
```

#### Task 1.2: Convert HTML Map to React Component (30-45 min)
**File**: `/components/gotham/GothamMapViewer.tsx`

**Critical Requirements**:
- Use `useEffect` for Three.js initialization
- Proper cleanup on unmount (dispose geometries, materials, renderer)
- Dynamic import with `ssr: false` to avoid Next.js SSR issues
- TypeScript types for all Three.js objects
- Preserve ALL existing features:
  * WASD + mouse controls
  * Click-to-travel to locations
  * Floating 3D labels
  * Minimap with live player position
  * Location cards with threat levels and detailed intel
  * Bat-Signal toggle
  * All 40+ locations with data
  * Street labels
  * Sky, stars, moon, clouds
  * Waterways/rivers
  * Building windows with lighting effects

**Architecture**:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function GothamMapViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    initMap();

    // Cleanup function
    return () => {
      cleanupMap();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* UI overlays */}
    </div>
  );
}
```

#### Task 1.3: Style Integration (15-20 min)
**Theme Conversion**: Gold (#ffd700) → Teal (#14b8a6)

**Elements to Update**:
- Info panel borders
- Minimap borders
- Location labels (neutral)
- Buttons and controls
- Coordinates display
- Highlights and accents

**Colors to Preserve**:
- Red (#ff0000) for villain territories
- Blue (#0064ff) for hero locations
- Specific location colors (ACE Chemicals green, etc.)

**Design Consistency**:
- Match Zarvânex button styles
- Use consistent border-radius (8px)
- Apply shadow styles
- Font family: inherit from main app

#### Task 1.4: Navigation Integration (5 min)
**Update**: `/components/Sidebar.tsx` and `/components/ChatInterface.tsx`

Change map navigation from:
```typescript
setCurrentView('map'); // Current iframe approach
```

To:
```typescript
router.push('/gotham-map'); // New route approach
```

---

## PHASE 2: DATA STRUCTURE & PATHFINDING PREPARATION (~1 hour)

### Objectives
Extract map data into structured TypeScript files for pathfinding and AI integration.

### Task 2.1: Extract Location Data Structure (20-30 min)
**File**: `/lib/gotham/locations.ts`

**Data Structure**:
```typescript
export interface GothamLocation {
  id: string;
  name: string;
  emoji: string;
  position: [number, number, number]; // x, y, z in 3D space
  type: 'hero' | 'villain' | 'neutral';
  category: 'hero' | 'villain' | 'district' | 'cultural' | 'waterway' | 'bridge';
  threat: 'low' | 'medium' | 'high' | 'extreme';
  color: number; // THREE.Color hex value
  description?: string;
  details?: string; // HTML formatted details
  icon?: string;
}

export const GOTHAM_LOCATIONS: GothamLocation[] = [
  // All 40+ locations from HTML
];
```

**Locations to Extract** (40+ total):

**Hero Locations (6)**:
- Financial District (0, 20, -50)
- Wayne Tower (-30, 60, -30)
- GCPD Headquarters (-40, 10, 40)
- Wayne Manor (-180, 25, -120)
- Batcave (-190, 6, -140)
- Clock Tower (-100, 35, -50)
- Wayne Bridge (-40, 6, 10)

**Villain Locations (7)**:
- Arkham Asylum (60, 15, 60)
- ACE Chemicals (120, 8, -40)
- Iceberg Lounge (-120, 12, 80)
- Poison Ivy's Lair (40, 10, -120)
- Two-Face Territory (-80, 15, 120)
- Blackgate Prison (160, 10, 80)
- Sionis Steel Mill (140, 15, -80)
- ACE Overpass (90, 6, -15)

**Neutral Locations (27)**:
- City Hall (0, 5, 0)
- Park Row (-60, 15, -80)
- Crime Alley (-25, 2, -70)
- Robinson Park (-90, 5, -90)
- Industrial Zone (80, 10, 20)
- The Narrows (-50, 8, 100)
- Amusement Mile (100, 12, 120)
- Chinatown (-140, 10, -10)
- Gotham University (50, 8, -80)
- Gotham General Hospital (20, 15, 80)
- Monarch Theatre (-15, 18, -20)
- Gotham Cathedral (30, 20, 20)
- Gotham Gazette (-70, 5, 20)
- S.T.A.R. Labs (65, 12, -30)
- North Docks (-150, 2, 40)
- Central Docks (-20, 2, 10)
- South Docks (110, 2, -10)
- Midtown Bridge (40, 6, -5)
- [Plus additional locations...]

### Task 2.2: Create Street Graph Data (30-40 min)
**File**: `/lib/gotham/streets.ts`

**Data Structure**:
```typescript
export interface StreetNode {
  id: string;
  position: [number, number, number];
  connectedTo: string[]; // IDs of connected nodes
  streetName?: string;
}

export interface Street {
  id: string;
  name: string;
  direction: 'horizontal' | 'vertical';
  position: number; // z for horizontal, x for vertical
  nodes: string[]; // Array of node IDs along this street
}

export const STREETS: Street[] = [
  // 25 streets from HTML
];

export const STREET_NODES: Record<string, StreetNode> = {
  // Grid-based street network for pathfinding
};
```

**Streets to Extract** (25 total):
1. Wayne Boulevard (horizontal, -30)
2. Gordon Avenue (horizontal, 0)
3. Penguin Street (horizontal, 60)
4. Batman Drive (vertical, -40)
5. Main Street (vertical, 0)
6. Joker Lane (vertical, 80)
7. Arkham Road (horizontal, 120)
8. Harvey Dent Way (vertical, -100)
9. Crime Alley/Willis St (horizontal, -65)
10. Robinson Park Blvd (horizontal, -90)
11. Kane Street (vertical, -70)
12. Finger Avenue (vertical, 40)
13. Miller Street (horizontal, 30)
14. Sprang Road (vertical, 110)
15. Aparo Avenue (horizontal, 90)
16. Dixon Avenue (vertical, -130)
17. Coventry Road (horizontal, -110)
18. Old Gotham Road (vertical, 150)
19. Grant Avenue (horizontal, -150)
20. Tricorner Yards (vertical, -160)
21. Gotham Avenue (horizontal, 150)
22. Bolland Street (vertical, 50)
23. Robbins Avenue (horizontal, -45)
24. Monarch Way (vertical, -20)
25. [Additional streets...]

**Graph Construction Approach**:
- Create intersection nodes at street crossings
- Connect nodes along each street
- Add location-specific nodes for major landmarks
- Grid spacing: ~25 units between nodes

### Task 2.3: Install Dependencies
```bash
npm install pathfinding
npm install @types/pathfinding --save-dev
```

---

## PHASE 3: ROUTING SYSTEM (~2 hours)

### Objectives
Implement pathfinding algorithm and visualize routes on 3D map.

### Task 3.1: Implement Pathfinding Algorithm (45-60 min)
**File**: `/lib/gotham/pathfinding.ts`

**Algorithm**: A* (A-Star) pathfinding

**Interface**:
```typescript
export interface RouteRequest {
  from: string | { x: number; z: number }; // Location name or coordinates
  to: string | { x: number; z: number };
  mode?: 'walking' | 'driving' | 'grappling'; // Affects speed/distance
  avoidDanger?: boolean; // Avoid high-threat areas
}

export interface RouteResult {
  path: Array<[number, number, number]>; // 3D coordinates
  distance: number; // in Gotham units (1 unit ≈ 10 meters)
  estimatedTime: number; // in minutes
  waypoints: Array<{
    position: [number, number, number];
    streetName: string;
    instruction?: string; // "Turn left onto Kane Street"
  }>;
  dangerZones?: Array<{
    location: string;
    threat: string;
  }>;
}

export function findRoute(request: RouteRequest): RouteResult {
  // 1. Parse locations (name → coordinates)
  // 2. Convert 3D coords to 2D grid (ignore Y)
  // 3. Find nearest street nodes
  // 4. Run A* pathfinding
  // 5. Smooth path (remove redundant waypoints)
  // 6. Convert back to 3D coordinates
  // 7. Calculate distance and time
  // 8. Generate turn-by-turn instructions
  // 9. Identify danger zones along route
}
```

**Implementation Details**:
- Grid resolution: 250x250 (covering -250 to +250 on X/Z)
- Heuristic: Manhattan distance
- Cost multipliers:
  * Walking: 1.0x
  * Driving: 0.3x (faster)
  * Grappling: 0.2x (Batman style, ignores obstacles)
- Danger penalty: +50% cost for high-threat areas if avoidDanger=true

### Task 3.2: Route Visualization Component (30-40 min)
**File**: `/components/gotham/RouteVisualizer.tsx`

**Features**:
- Glowing teal line (#14b8a6) showing route path
- Animated particles moving along route (simulate travel)
- Waypoint markers at intersections (small teal spheres)
- Distance/time overlay display
- Danger zone highlights (red pulses)

**Three.js Implementation**:
```typescript
function visualizeRoute(route: RouteResult, scene: THREE.Scene) {
  // Create tube geometry along path
  const curve = new THREE.CatmullRomCurve3(
    route.path.map(p => new THREE.Vector3(p[0], p[1], p[2]))
  );

  const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.5, 8, false);
  const tubeMaterial = new THREE.MeshBasicMaterial({
    color: 0x14b8a6,
    transparent: true,
    opacity: 0.7,
    emissive: 0x14b8a6,
    emissiveIntensity: 0.5
  });

  const routeLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(routeLine);

  // Add animated particles
  // Add waypoint markers
  // Add distance/time UI
}
```

### Task 3.3: Route Control Panel (20-30 min)
**File**: `/components/gotham/RoutePanel.tsx`

**UI Features**:
- "From" location: Dropdown + search autocomplete
- "To" location: Dropdown + search autocomplete
- Travel mode: Radio buttons (Walking/Driving/Grappling)
- "Avoid dangerous areas": Checkbox
- "Find Route" button (teal, prominent)
- Results display:
  * Distance in km
  * Estimated time
  * Threat level indicator
  * Waypoints list (collapsible)
- "Clear Route" button

**Styling**:
- Matches Zarvânex aesthetic
- Teal accents (#14b8a6)
- Dark background (rgba(0,0,0,0.9))
- Position: Top-right corner
- Collapsible/expandable
- Smooth animations

---

## PHASE 4: CLAUDE AI INTEGRATION (~1 hour)

### Objectives
Enable natural language route queries through Claude AI.

### Task 4.1: Create Route API Endpoint (15-20 min)
**File**: `/app/api/gotham/route/route.ts`

**Endpoint**: `POST /api/gotham/route`

**Request**:
```typescript
{
  query: string; // Natural language: "How do I get from Wayne Tower to Arkham?"
  mode?: 'walking' | 'driving' | 'grappling';
}
```

**Response**:
```typescript
{
  from: string; // "Wayne Tower"
  to: string; // "Arkham Asylum"
  route: RouteResult;
  summary: string; // Human-readable summary
}
```

**Implementation**:
1. Parse location names from query using regex/AI
2. Validate locations exist in GOTHAM_LOCATIONS
3. Call findRoute() from pathfinding.ts
4. Format response with summary
5. Handle errors (location not found, no route possible)

### Task 4.2: Add Gotham Context to Claude (10 min)
**File**: Update Claude system prompt

**Context to Add**:
```
GOTHAM MAP FEATURE:
You have access to a 3D map of Gotham City with routing capabilities.

Available locations (40+ total):
- Hero: Wayne Tower, GCPD HQ, Clock Tower, Wayne Manor, Batcave, Financial District
- Villain: Arkham Asylum, ACE Chemicals, Iceberg Lounge, Blackgate Prison, etc.
- Districts: Crime Alley, Park Row, The Narrows, Chinatown, etc.
- Infrastructure: Bridges, docks, landmarks

When users ask for directions/routes:
1. Extract FROM and TO locations
2. Use the /api/gotham/route endpoint
3. Return distance, time, and waypoints
4. Offer "View on Map" button

Example response format:
"Route found from Wayne Tower to Arkham Asylum:
- Distance: 8.3 km
- Time: 12 minutes (by Batmobile)
- Route: Wayne Tower → Clock Tower → Robinson Park → Arkham Road → Arkham Asylum
- Threat Level: HIGH (passes through dangerous areas)
[View on Map]"
```

### Task 4.3: Message Handler Enhancement (30-40 min)
**File**: Update `/components/ChatInterface.tsx` or message handling

**Features**:
1. **Detect Route Responses**: Pattern matching for route information in Claude's messages
2. **"View on Map" Button**:
   - Appears when route info detected
   - Stores route data in state/context
   - Navigates to `/gotham-map` with route pre-loaded
3. **Auto-Visualization**: Route automatically displays on map when page loads
4. **Deep Linking**: URL params to share routes
   - Example: `/gotham-map?from=Wayne+Tower&to=Arkham+Asylum&mode=driving`

**Implementation**:
```typescript
// In message renderer
if (message.content.includes('Route found') || message.metadata?.hasRoute) {
  return (
    <div>
      {message.content}
      <button
        onClick={() => navigateToMapWithRoute(message.metadata.route)}
        className="mt-2 px-4 py-2 bg-teal-600 rounded"
      >
        View on Map
      </button>
    </div>
  );
}
```

---

## DATA REFERENCE

### Complete Location List (40+ locations)

#### Hero Locations (7)
1. **Financial District** - Economic heart, Wayne Enterprises HQ
2. **Wayne Tower** - Tallest building, Batman operations base
3. **GCPD Headquarters** - Police HQ with Bat-Signal
4. **Wayne Manor** - Bruce Wayne's ancestral home
5. **Batcave** - Secret underground base
6. **Clock Tower** - Oracle's headquarters (Barbara Gordon)
7. **Wayne Bridge** - Elegant Art Deco suspension bridge

#### Villain Locations (8)
1. **Arkham Asylum** - Psychiatric hospital for criminally insane
2. **ACE Chemicals** - Joker's birthplace, toxic wasteland
3. **Iceberg Lounge** - Penguin's nightclub/crime hub
4. **Poison Ivy's Lair** - Toxic greenhouse complex
5. **Two-Face Territory** - Old courthouse district
6. **Blackgate Prison** - Maximum security prison island
7. **Sionis Steel Mill** - Black Mask's torture facility
8. **ACE Overpass** - Rusting industrial bridge

#### Neutral Locations (27+)
1. **City Hall** - Gotham government seat
2. **Park Row** - Residential district in decline
3. **Crime Alley** - Wayne murder site
4. **Robinson Park** - 250-acre public park
5. **Industrial Zone** - Factories and warehouses
6. **The Narrows** - Most dangerous slum district
7. **Amusement Mile** - Abandoned theme park
8. **Chinatown** - Asian cultural district
9. **Gotham University** - Premier university (18,000 students)
10. **Gotham General Hospital** - Level 1 trauma center
11. **Monarch Theatre** - Wayne family's last outing site
12. **Gotham Cathedral** - Largest church, Gothic Revival
13. **Gotham Gazette** - Primary newspaper
14. **S.T.A.R. Labs Gotham** - Scientific research facility
15. **North Docks** - Cargo piers, northern riverbank
16. **Central Docks** - Busy ferry terminal
17. **South Docks** - Contaminated waters near ACE
18. **Midtown Bridge** - Main commuter bridge
19. [Plus additional cultural and infrastructure locations]

### Street Network (25 streets)

#### Major Arteries
- **Wayne Boulevard** - Main east-west thoroughfare
- **Gordon Avenue** - Central horizontal axis
- **Main Street** - Primary north-south route
- **Batman Drive** - Vertical connector

#### Lore-Accurate Streets
- **Crime Alley (Willis Street)** - Site of Wayne tragedy
- **Kane Street** - GCPD location
- **Finger Avenue** - Clock Tower location
- **Miller Street**, **Sprang Road**, **Aparo Avenue** - Named after Batman creators
- **Dixon Avenue**, **Robbins Avenue**, **Bolland Street** - Batman artist tributes

---

## TECHNICAL SPECIFICATIONS

### Coordinate System
- **Origin**: (0, 0, 0) at City Hall
- **X-axis**: West (-) to East (+)
- **Y-axis**: Ground (0) to Sky (+)
- **Z-axis**: North (-) to South (+)
- **Range**: -250 to +250 on X/Z axes
- **Units**: ~1 unit = 10 meters in real-world scale

### Performance Considerations
1. **Three.js in Next.js**:
   - Use dynamic import: `const MapViewer = dynamic(() => import('@/components/gotham/GothamMapViewer'), { ssr: false })`
   - Prevents server-side rendering errors

2. **Memory Management**:
   - Dispose geometries: `geometry.dispose()`
   - Dispose materials: `material.dispose()`
   - Dispose textures: `texture.dispose()`
   - Remove event listeners in cleanup

3. **Optimization**:
   - Use BufferGeometry for buildings
   - Instance buildings where possible
   - LOD (Level of Detail) for distant objects
   - Frustum culling for labels

### Browser Compatibility
- **Target**: Modern desktop browsers (Chrome, Firefox, Edge, Safari)
- **WebGL**: Required (Three.js dependency)
- **Mobile**: Phase 1 desktop-only, mobile optimization later

---

## IMPLEMENTATION TIMELINE

### Immediate (Current Session)
- ✅ Basic iframe integration complete
- ✅ Sidebar navigation working
- ✅ Dependencies installed
- ✅ Master plan documented

### Phase 1 (Next Session - ~1 hour)
- Convert to React component
- Style with teal theme
- Proper routing
- Full feature parity

### Phase 2 (Future - ~1 hour)
- Extract location data
- Create street graph
- Prepare pathfinding data

### Phase 3 (Future - ~2 hours)
- Implement A* pathfinding
- Route visualization
- Control panel UI

### Phase 4 (Future - ~1 hour)
- API endpoint
- Claude integration
- Chat interface enhancements

**Total estimated completion: 5-6 hours across multiple sessions**

---

## FUTURE ENHANCEMENTS

### Post-MVP Features
1. **Advanced Routing**:
   - Multi-stop routes (waypoints)
   - Real-time traffic simulation
   - Villain activity alerts
   - Safe routes for civilians

2. **Interactive Features**:
   - Crime reporting system
   - Villain sighting markers
   - Mission waypoints
   - Photo mode

3. **Analytics**:
   - Most dangerous routes
   - Most traveled paths
   - Threat heatmap
   - Time-of-day danger variations

4. **Mobile Experience**:
   - Touch controls
   - Gyroscope navigation
   - Simplified UI for small screens

5. **Multiplayer/Social**:
   - Share routes with friends
   - Collaborative investigations
   - Leaderboards (fastest routes)

---

## ARCHITECTURAL DECISIONS

### Why React Component vs Iframe?
**Iframe (Current)**:
- ✅ Quick implementation
- ✅ No code conversion needed
- ❌ Limited integration
- ❌ No access to map state
- ❌ Can't add routing features

**React Component (Target)**:
- ✅ Full control over map
- ✅ State management integration
- ✅ Can add routing visualization
- ✅ Better performance
- ✅ Proper TypeScript types
- ❌ More complex setup

**Decision**: React component for full feature set.

### Why A* for Pathfinding?
- Proven algorithm for grid-based pathfinding
- Optimal paths guaranteed
- Efficient with heuristics
- Easy to add cost modifiers (danger zones, travel modes)

### Why Separate API Endpoint?
- Claude can call it directly
- Testable independently
- Reusable for future features
- Follows REST principles

---

## TESTING STRATEGY

### Phase 1 Tests
- Map renders without errors
- All 40+ locations visible
- Controls (WASD, mouse) working
- Minimap updates
- Location cards display
- Bat-Signal toggles
- Mobile responsiveness

### Phase 3 Tests
- Routes calculated correctly
- No invalid paths
- Optimal path selected
- Visual route appears on map
- Distance calculations accurate
- Time estimates reasonable

### Phase 4 Tests
- Claude understands location names
- API parses queries correctly
- Routes display in chat
- "View on Map" button works
- Deep links function

---

## TROUBLESHOOTING GUIDE

### Common Issues

**Three.js "window is not defined" error**:
```typescript
// Use dynamic import
const MapViewer = dynamic(() => import('@/components/gotham/GothamMapViewer'), {
  ssr: false
});
```

**Memory leaks**:
```typescript
useEffect(() => {
  // ... init code ...

  return () => {
    // Cleanup
    renderer?.dispose();
    scene?.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  };
}, []);
```

**Route not showing**:
- Check coordinates are within map bounds (-250 to 250)
- Verify locations exist in GOTHAM_LOCATIONS
- Ensure pathfinding grid includes path
- Check Three.js scene contains route mesh

---

## CONTACT & NOTES

**Project**: Zarvânex Gotham Map Integration
**Start Date**: 2025-01-20
**Status**: Phase 1 Pending
**Next Session**: Begin React component conversion

**Key Files**:
- `/public/gotham-map.html` - Original standalone map
- `/components/Map.tsx` - Current iframe wrapper
- `/components/Sidebar.tsx` - Navigation integration
- `/components/ChatInterface.tsx` - Main app component

**Resources**:
- Three.js docs: https://threejs.org/docs/
- A* algorithm: https://en.wikipedia.org/wiki/A*_search_algorithm
- Gotham City map lore: Arkham games, DC Comics

---

*This plan will be updated as implementation progresses.*
