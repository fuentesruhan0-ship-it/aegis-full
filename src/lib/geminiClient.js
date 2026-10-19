// @ts-nocheck
// Direct Google Gemini API Client for AEGIS Emergency Assistant

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest'
];

const AEGIS_SYSTEM_PROMPT = `You are the AEGIS AI Emergency Assistant, an intelligent disaster preparedness, response, and recovery AI for the Philippines (focused on Tupi, South Cotabato and the South East Asian Institute of Technology community).

CRITICAL DIRECTIVES:
1. Ground your advice in official disaster management standards: PHIVOLCS, NDRRMC, Philippine Red Cross, and USGS.
2. During active shaking: instruct immediately to DROP to hands and knees, COVER head/neck under a sturdy table, and HOLD ON until shaking stops. If outdoors, move to open area away from power lines and glass.
3. Be clear, concise, reassuring, and structured using clean markdown (bullet points, bold key terms).
4. If asked about future earthquake predictions (e.g., "will there be an earthquake on date X?"): clearly clarify that earthquakes cannot be predicted scientifically ahead of time, explain aftershock patterns if applicable, and emphasize preparedness.
5. If the user reports an active emergency or life-threatening crisis: urgently advise dialing 911 (or local NDRRMC) and using the in-app SOS broadcast button.
6. Local context: Tupi, South Cotabato is near the Cotabato Fault system and Central Mindanao Fault zone. Keep advice actionable for local homes, schools, and workplaces.`;

export function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';
}

export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

/**
 * Ask Google Gemini API for an assistant response
 * @param {string} message - Current user message
 * @param {Array<{role: string, content: string}>} history - Previous messages
 * @returns {Promise<{reply: string, model: string}>}
 */
export async function queryGeminiAssistant(message, history = []) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING: No Gemini API key found in configuration.');
  }

  // Format history for Gemini API: roles must be 'user' or 'model'
  const contents = [];
  for (const h of history) {
    if (!h.content) continue;
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const requestBody = {
    systemInstruction: {
      parts: [{ text: AEGIS_SYSTEM_PROMPT }]
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024
    }
  };

  let lastError = null;

  // Use Vite proxy in development to eliminate browser CORS/adblock restrictions
  const proxyBase = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/gemini-api'
    : 'https://generativelanguage.googleapis.com';

  for (const model of GEMINI_MODELS) {
    try {
      const url = `${proxyBase}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const err = data.error || {};
        const code = err.code || res.status;
        const msg = err.message || 'Unknown Gemini API error';

        if (code === 403) {
          throw new Error(`Gemini API 403 (Forbidden): ${msg}`);
        }
        if (code === 429) {
          throw new Error(`Gemini API 429 (Quota Exceeded): ${msg}`);
        }
        if (code === 400) {
          throw new Error(`Gemini API 400 (Bad Request): ${msg}`);
        }

        // Try next fallback model if 404 or model unavailable
        lastError = new Error(`Model ${model} error (${code}): ${msg}`);
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { reply: text, model };
      }
    } catch (e) {
      if (e.message?.includes('403') || e.message?.includes('429')) {
        throw e; // Do not retry other models if whole project is denied or out of quota
      }
      lastError = e;
    }
  }

  throw lastError || new Error('Could not get response from Gemini API.');
}
