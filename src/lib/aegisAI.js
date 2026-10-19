// AEGIS AI Emergency Assistant Engine
// Provides intelligent, contextual emergency guidance and conversational responses

import { OFFLINE_KNOWLEDGE } from './offlineKnowledge.js';

const GREETINGS = [
  'hi', 'hello', 'hey', 'kamusta', 'musta', 'good morning', 'good afternoon', 'good evening', 'greetings', 'yo', 'sup'
];

const BOT_IDENTITY = [
  'who are you', 'what are you', 'what can you do', 'what is aegis', 'what is this app', 'help me', 'how to use'
];

const GRATITUDE = [
  'thanks', 'thank you', 'salamat', 'ok thanks', 'okay thanks', 'appreciate it'
];

export function generateAIAssistantReply(message, history = []) {
  const normalized = message.trim().toLowerCase();

  // 1. Check for simple greetings
  const isGreeting = GREETINGS.some((g) => {
    return normalized === g || normalized.startsWith(g + ' ') || normalized.endsWith(' ' + g) || normalized.includes(g + '!');
  });

  if (isGreeting) {
    return (
      "Hello! I am your **AEGIS AI Emergency Assistant**.\n\n" +
      "I'm here to help you with:\n" +
      "• **Earthquake Safety:** Immediate actions during shaking (Drop, Cover, Hold On)\n" +
      "• **Preparedness:** 72-hour Go-Bag checklists and household evacuation planning\n" +
      "• **Post-Quake Recovery:** Structural inspection, gas/utility shutoffs, and aftershock safety\n" +
      "• **Local Info:** Guidance aligned with PHIVOLCS & NDRRMC standards for Tupi, South Cotabato\n\n" +
      "How can I help you or your family prepare or stay safe today?"
    );
  }

  // 2. Identity & Capability questions
  if (BOT_IDENTITY.some((q) => normalized.includes(q))) {
    return (
      "I am the **AEGIS AI Emergency Assistant**, designed specifically to provide authoritative, verified earthquake preparedness and disaster response guidance.\n\n" +
      "You can ask me questions like:\n" +
      "• *\"What should I do during an earthquake?\"*\n" +
      "• *\"What items belong in a 72-hour go-bag?\"*\n" +
      "• *\"How do I know if my building has structural damage?\"*\n" +
      "• *\"How do I safely turn off utilities?\"*\n\n" +
      "⚠️ *In case of an active life-threatening emergency, please activate the app's **SOS** button to alert your emergency contacts or dial **911** immediately.*"
    );
  }

  // 3. Gratitude
  if (GRATITUDE.some((g) => normalized.includes(g))) {
    return "You're very welcome! Stay safe, keep your emergency kit handy, and don't hesitate to ask if you have any more questions.";
  }

  // 4. Critical active emergency detection
  if (
    normalized.includes('earthquake right now') ||
    normalized.includes('shaking now') ||
    normalized.includes('happening now') ||
    normalized.includes('earthquake now') ||
    normalized.includes('help me now') ||
    normalized.includes('trapped')
  ) {
    return (
      "🚨 **ACTIVE EMERGENCY SAFETY ACTIONS:**\n\n" +
      "1. **DROP:** Drop immediately to your hands and knees.\n" +
      "2. **COVER:** Cover your head and neck under a sturdy desk or table. If none is available, crawl to an interior wall away from windows.\n" +
      "3. **HOLD ON:** Hold on to your shelter until the shaking completely stops.\n\n" +
      "• **Do NOT run outside** while the ground is shaking — falling glass and debris cause most injuries.\n" +
      "• If trapped or injured, make noise (whistle or knock on pipes/walls).\n" +
      "• Use the **SOS** button in AEGIS to broadcast your location to your household and emergency contacts!"
    );
  }

  // 5. Earthquake prediction / rumor queries
  if (
    normalized.includes('predict') ||
    normalized.includes('prediction') ||
    normalized.includes('will there be an earthquake') ||
    normalized.includes('when is the next earthquake') ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b.*\bearthquake\b/i.test(normalized) ||
    /\bearthquake\b.*\b(tomorrow|next week|next month|soon|2025|2026|2027)\b/i.test(normalized)
  ) {
    return (
      "⚠️ **Scientific Fact on Earthquake Predictions:**\n\n" +
      "**Earthquakes cannot be predicted ahead of time.** Neither PHIVOLCS, USGS, nor any scientific agency in the world has the technology or method to predict the exact date, time, or magnitude of an earthquake.\n\n" +
      "• **Disregard viral rumors or social media panic posts:** Always rely solely on verified bulletins from official agencies like [PHIVOLCS-DOST](https://www.phivolcs.dost.gov.ph).\n" +
      "• **Focus on Preparedness:** Because earthquakes strike without warning, continuous readiness is the best protection:\n" +
      "  1. Practice **Drop, Cover, and Hold On** with your household or workplace.\n" +
      "  2. Keep your **72-hour Go-Bag** packed and easily accessible near your exit.\n" +
      "  3. Fasten heavy furniture and appliances securely to walls.\n" +
      "  4. Familiarize yourself with designated evacuation areas in Tupi, South Cotabato."
    );
  }

  // 6. Match against Knowledge Base (multi-keyword scoring)
  let bestMatch = null;
  let highestScore = 0;

  for (const item of OFFLINE_KNOWLEDGE) {
    let score = 0;

    // Direct keyword match
    for (const kw of item.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        score += 3;
      }
    }

    // Question word overlap
    const questionWords = item.question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    for (const qw of questionWords) {
      if (normalized.includes(qw)) {
        score += 2;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && highestScore >= 2) {
    return bestMatch.answer;
  }

  // 6. Conversational contextual fallback
  return (
    "I understand you're asking about: *\"" + message + "\"*.\n\n" +
    "As the AEGIS Emergency Assistant, I specialize in disaster preparedness, active earthquake response, and post-disaster recovery.\n\n" +
    "**Key Recommended Actions:**\n" +
    "1. **During an Earthquake:** Remember **Drop, Cover, and Hold On**.\n" +
    "2. **Safety Preparation:** Keep a 72-hour Go-Bag packed near your main exit.\n" +
    "3. **Aftershocks:** Expect aftershocks and stay away from visibly damaged walls or electrical hazards.\n" +
    "4. **Emergencies:** If you or someone nearby is injured or in immediate danger, use the **SOS** feature in the AEGIS menu or call **911**.\n\n" +
    "Feel free to ask for specific steps on go-bag packing, evacuation routes, or building inspection!"
  );
}
