// AEGIS Earthquake Risk Engine
// Computes personalized seismic hazard exposure and matches educational resources

// Active Fault Lines (Mindanao & Philippines Key Reference Traces)
export const ACTIVE_FAULTS = [
  {
    name: "Cotabato Fault System (Central & Southern Traces)",
    classification: "Active - High Seismic Potential",
    historicMaxMag: 7.2,
    coordinates: [
      [6.0, 125.0], [6.15, 125.08], [6.25, 125.15], [6.38, 125.22], [6.6, 125.4], [7.0, 125.6]
    ],
    description: "Major strike-slip fault system passing through South Cotabato and Cotabato basin. Source of multiple strong historical earthquakes.",
  },
  {
    name: "Central Mindanao Fault Zone",
    classification: "Active",
    historicMaxMag: 6.9,
    coordinates: [
      [8.5, 124.5], [8.0, 124.8], [7.5, 125.1], [7.0, 125.3], [6.5, 125.5]
    ],
    description: "Traverses central Mindanao plateau with documented shallow crustal quakes.",
  },
  {
    name: "Daguma Extension Fault",
    classification: "Active",
    historicMaxMag: 6.6,
    coordinates: [
      [6.4, 124.6], [6.5, 124.7], [6.7, 124.85], [6.9, 125.0]
    ],
    description: "Western flank fault zone bordering Sultan Kudarat and South Cotabato hills.",
  },
  {
    name: "Cotabato Trench (Subduction Zone)",
    classification: "Active Subduction Trench",
    historicMaxMag: 8.0,
    coordinates: [
      [5.5, 124.0], [6.0, 124.2], [6.5, 124.3], [7.0, 124.1]
    ],
    description: "Major offshore subduction margin in Moro Gulf, capable of tsunamigenic megathrust events (e.g. 1976 Moro Gulf M8.1).",
  },
  {
    name: "Philippine Fault - Southern Mindanao Segment",
    classification: "Active - Strike Slip",
    historicMaxMag: 7.5,
    coordinates: [
      [9.8, 125.6], [8.5, 126.0], [7.2, 126.1], [6.3, 126.0]
    ],
    description: "Eastern Mindanao segment of the master Philippine Fault Zone running along Davao Oriental.",
  }
];

// Predefined Barangays in Tupi, South Cotabato for quick selection
export const TUPI_BARANGAYS = [
  { name: "Barangay Poblacion (Center)", lat: 6.2356, lng: 125.0286, soilType: "Alluvial / Volcanic Soil", slope: "Flat / Valley" },
  { name: "Barangay Acmonan", lat: 6.2625, lng: 125.0410, soilType: "Loam / Agricultural", slope: "Gentle Slope" },
  { name: "Barangay Bunao", lat: 6.2150, lng: 125.0120, soilType: "Alluvial", slope: "Flat" },
  { name: "Barangay Crossing Rubber", lat: 6.2480, lng: 125.0530, soilType: "Volcanic Loam", slope: "Rolling" },
  { name: "Barangay Kablon", lat: 6.2890, lng: 125.0850, soilType: "Volcanic Foot-slope (Mt. Matutum)", slope: "Steep / Foothills" },
  { name: "Barangay Kalkam", lat: 6.2550, lng: 124.9920, soilType: "Clay Loam", slope: "Rolling" },
  { name: "Barangay Linan", lat: 6.3050, lng: 125.0150, soilType: "Volcanic Soil", slope: "Elevated" },
  { name: "Barangay Lunen", lat: 6.2080, lng: 125.0680, soilType: "Sandy Alluvium", slope: "Flat / Near Creek" },
  { name: "Barangay Polonuling", lat: 6.2710, lng: 124.9650, soilType: "Riverine Alluvial", slope: "Flat / Floodplain" },
  { name: "Barangay Simbo", lat: 6.2200, lng: 124.9850, soilType: "Loam", slope: "Flat" },
  { name: "Barangay Tubo", lat: 6.1850, lng: 125.0450, soilType: "Loam / Silt", slope: "Gentle Valley" },
];

// Haversine distance in km between two lat/lng points
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from a point to a polyline segment
function minDistanceToPolyline(lat, lng, coordinates) {
  let minDistance = Infinity;
  for (let i = 0; i < coordinates.length; i++) {
    const [cLat, cLng] = coordinates[i];
    const dist = calculateDistanceKm(lat, lng, cLat, cLng);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}

// Calculate Comprehensive Hazard Risk
export function assessLocationRisk(lat, lng, locationName = "") {
  // 1. Find closest fault
  let closestFault = null;
  let minDistance = Infinity;

  ACTIVE_FAULTS.forEach((fault) => {
    const dist = minDistanceToPolyline(lat, lng, fault.coordinates);
    if (dist < minDistance) {
      minDistance = dist;
      closestFault = fault;
    }
  });

  const roundedDistance = Math.max(0.5, Math.round(minDistance * 10) / 10);

  // 2. Compute Risk Score (0 - 100)
  // Distance scoring (weight: 55%)
  let distanceScore = 0;
  if (roundedDistance <= 3) distanceScore = 55;
  else if (roundedDistance <= 8) distanceScore = 48;
  else if (roundedDistance <= 15) distanceScore = 40;
  else if (roundedDistance <= 25) distanceScore = 30;
  else if (roundedDistance <= 40) distanceScore = 20;
  else distanceScore = 10;

  // Regional Seismic History baseline (Tupi/South Cotabato sits in high-seismic zone, weight: 25%)
  const historicalBaseline = 22; // High historical frequency of M5.0+ quakes

  // Geological Soil/Liquefaction Factor (weight: 20%)
  const isFoothill = lat > 6.27 && lng > 125.06; // Mt. Matutum slope -> higher landslide risk
  const isRiverPlain = roundedDistance > 10 && lat < 6.23; // lower plain -> moderate liquefaction risk
  let terrainFactor = 12;
  let primaryTerrainHazard = "Moderate Ground Shaking";

  if (isFoothill) {
    terrainFactor = 16;
    primaryTerrainHazard = "Slope Instability & Earthquake-Triggered Landslides";
  } else if (isRiverPlain) {
    terrainFactor = 14;
    primaryTerrainHazard = "Loose Soil Amplification & Minor Liquefaction Susceptibility";
  }

  const rawScore = distanceScore + historicalBaseline + terrainFactor;
  const riskScore = Math.min(100, Math.max(15, Math.round(rawScore)));

  // Risk Classification
  let riskLevel = "Moderate";
  let badgeColor = "amber";
  let expectedIntensity = "PHIVOLCS Intensity VI (Very Strong)";

  if (riskScore >= 75) {
    riskLevel = "Severe";
    badgeColor = "rose";
    expectedIntensity = "PHIVOLCS Intensity VIII (Very Destructive)";
  } else if (riskScore >= 55) {
    riskLevel = "High";
    badgeColor = "orange";
    expectedIntensity = "PHIVOLCS Intensity VII (Destructive)";
  } else if (riskScore < 40) {
    riskLevel = "Low";
    badgeColor = "emerald";
    expectedIntensity = "PHIVOLCS Intensity IV - V (Moderately Strong)";
  }

  // Recommended Action Items
  const actionItems = [];
  if (riskScore >= 55) {
    actionItems.push("Anchor heavy ceiling fans, cupboards, and overhead book shelves with L-brackets.");
    actionItems.push("Identify structural interior load-bearing walls away from exterior windows and glass doors.");
    actionItems.push("Keep shoes and flashlights directly beside each family member's bed at night.");
    actionItems.push("Designate a primary open-air assembly point at least 1.5x the height of adjacent buildings.");
  } else {
    actionItems.push("Ensure your 72-hour Go-Bag is updated with fresh water and essential medicines.");
    actionItems.push("Practice the Drop, Cover, and Hold On drill twice a year with all household members.");
    actionItems.push("Memorize emergency hotline numbers and establish an out-of-town SMS contact person.");
  }

  return {
    locationName: locationName || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    lat,
    lng,
    riskScore,
    riskLevel,
    badgeColor,
    expectedIntensity,
    nearestFault: {
      name: closestFault?.name || "Active Fault Trace",
      distanceKm: roundedDistance,
      classification: closestFault?.classification || "Active",
      description: closestFault?.description || "",
      historicMaxMag: closestFault?.historicMaxMag || 7.0,
    },
    primaryTerrainHazard,
    actionItems,
    assessedDate: new Date().toISOString(),
  };
}

// Educational Resource Center Library
export const EDUCATIONAL_RESOURCES = [
  {
    id: "edu-1",
    title: "Drop, Cover, and Hold On: Room-by-Room Survival Guide",
    category: "immediate_response",
    categoryLabel: "Active Shaking",
    readTime: "3 min read",
    priority: "all",
    summary: "The official science-backed protocol recommended by PHIVOLCS, NDRRMC, and FEMA. What to do in bed, kitchen, high-rise, or car.",
    content: `### 1. The Core Technique
When shaking begins, **DO NOT RUN OUTSIDE**. The majority of injuries are caused by flying glass, falling masonry, and collapsing parapets near exterior doorways.

• **DROP:** Drop to your hands and knees immediately. This stops the ground movement from knocking you over and keeps you low.
• **COVER:** Cover your head and neck with your arms. Crawl under a sturdy table, desk, or robust piece of furniture.
• **HOLD ON:** Hold on tightly to the leg of your shelter with one hand and keep your other arm over your neck. Be ready to move with the table as it slides.

### 2. Room-by-Room Variations
* **In Bed:** Stay in bed. Turn face down and cover your head and neck with a pillow. Broken glass on the floor makes moving in the dark very dangerous.
* **In the Kitchen:** Step immediately away from the stove, refrigerator, and overhead cabinets containing heavy chinaware.
* **In a Vehicle:** Safely pull over to the shoulder away from overpasses, bridges, and power lines. Remain inside the vehicle until shaking ceases.
* **In a High-Rise:** Stay away from windows and glass facades. Never attempt to use the elevators.`,
  },
  {
    id: "edu-2",
    title: "Securing Your Home Against Fault-Line Ground Shaking",
    category: "structural",
    categoryLabel: "Structural Prep",
    readTime: "5 min read",
    priority: "high",
    summary: "How to anchor heavy furniture, inspect concrete hollow block walls, and eliminate death-trap objects in residential buildings.",
    content: `### 1. The Non-Structural Hazard Check
More than 70% of injuries in Philippine earthquakes (M6.0+) occur due to falling objects rather than total building collapse.

* **Top-Heavy Furniture:** Fasten wardrobes (*aparador*), tall bookcases, and refrigerators to wall studs using metal L-brackets.
* **Overhead Dangers:** Remove heavy picture frames, mirrors, and hanging plants from directly above beds and sofas.
* **Gas & Cylinders:** Fasten LPG tanks with a chain or strap so they cannot tip over and shear the rubber gas hose.
* **Exit Corridors:** Keep hallways and main exits completely free of shoes, boxes, and obstacles.

### 2. Structural Inspection Checklist
If you live within 15 km of an active fault trace:
1. Check concrete hollow block (CHB) walls for diagonal or stair-step cracks exceeding 3mm in width.
2. Verify that roof trusses and ceiling purlins are anchored to lintel beams, not just resting on bare masonry.
3. Consult a licensed civil/structural engineer if your home was built on soft riverbed alluvium or steep hillside fill.`,
  },
  {
    id: "edu-3",
    title: "Understanding PHIVOLCS Earthquake Intensity Scale (PEIS)",
    category: "science",
    categoryLabel: "Science & Scales",
    readTime: "4 min read",
    priority: "all",
    summary: "Clear distinction between Magnitude (energy at focus) and Intensity (shaking felt at your specific location).",
    content: `### Magnitude vs. Intensity: Why It Matters
Many residents confuse Magnitude and Intensity, leading to mistaken assumptions about their safety.

* **Magnitude (Instrumental):** A measure of the total seismic energy released at the earthquake hypocenter (e.g., Magnitude 6.5). There is only ONE magnitude per earthquake.
* **Intensity (Local Impact):** A measure of the severity of ground shaking observed and felt by humans, structures, and ground surface at a specific location.

### The PEIS Key Levels:
* **PEIS IV (Moderately Strong):** Felt generally indoors by people. Hanging objects swing moderately. Dinner plates rattle.
* **PEIS V (Strong):** Strong shaking felt by most people indoors and outdoors. Small or unstable objects overturned.
* **PEIS VI (Very Strong):** Many people frightened, run outdoors. Heavy furniture moves. Small plaster cracks appear in poorly constructed walls.
* **PEIS VII (Destructive):** People find it difficult to stand outdoors. Old or unreinforced masonry suffers heavy damage. Cracks appear in paved roads.
* **PEIS VIII (Very Destructive):** Railway tracks bent. Concrete buildings severely damaged. Ground fissures and landslides triggered in hillsides.`,
  },
  {
    id: "edu-4",
    title: "72-Hour Go-Bag Essentials for South Cotabato Households",
    category: "survival",
    categoryLabel: "Emergency Kit",
    readTime: "4 min read",
    priority: "all",
    summary: "Must-have supplies, water purification ratios, waterproof document protection, and expiry management.",
    content: `### The Golden 72-Hour Rule
External relief operations from local disaster offices often take up to 72 hours to reach all residential sectors during road blockages.

### Essential Components:
1. **Water:** 1 gallon (4 liters) per person per day (for drinking and hygiene).
2. **Food:** Ready-to-eat canned goods (easy open), high-calorie biscuits, vacuum-packed dry rations.
3. **Lighting & Power:** Heavy-duty LED flashlight, hand-crank or solar radio, pre-charged high-capacity power bank with cables.
4. **First Aid & Medicine:** Antiseptics, sterile gauze, tourniquet, adhesive bandages, and at least a 7-day supply of personal prescription medications.
5. **Personal Whistle:** A pea-less whistle attached to each family member's bag. Whistling saves your breath if trapped under debris.
6. **Waterproof Document Pouch:** Photocopies and USB drive containing government IDs, birth certificates, property titles, and emergency contact list.`,
  },
  {
    id: "edu-5",
    title: "Liquefaction and Slope Hazards in Tupi & Mt. Matutum",
    category: "local_hazard",
    categoryLabel: "Local Hazards",
    readTime: "5 min read",
    priority: "high",
    summary: "Geographical breakdown of volcanic ash soils, high water tables, and landslide risks near Tupi streams and foothills.",
    content: `### 1. What is Soil Liquefaction?
Liquefaction is a phenomenon where water-saturated, loose, sandy or silty soil temporarily loses its strength and behaves like quicksand during prolonged ground shaking.
* **Signs of Liquefaction:** Water and sand fountains erupting through floor cracks (*sand boils*), ground subsidence, and tilting foundations.
* **At-Risk Sectors:** Lowland stream banks and saturated agricultural valley floors near Polonuling and Lunen.

### 2. Mt. Matutum Slope Hazards
For residents in elevated barangays like Kablon and Linan:
* Strong ground shaking can destabilize steep volcanic loam slopes, triggering debris avalanches and localized landslides.
* During or immediately after significant shaking, stay vigilant for roaring ground noises, sudden muddy water flows in creeks, and tilting trees.
* Evacuate laterally away from the fall line of steep slopes to pre-designated wide open pastures.`,
  }
];
