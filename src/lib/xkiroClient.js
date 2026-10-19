// @ts-nocheck
// Direct xKiro AI API Client for AEGIS Emergency Assistant (OpenAI compatible)

const XKIRO_MODELS = [
  'qwen/qwen3.5-flash:free',
  'qwen/qwen3.7-flash:free',
  'qwen/qwen3.8-omni-flash:free',
  'qwen/qwen3.8-max:free',
  'cohere/command-r7b-12-2024'
];

const AEGIS_SYSTEM_PROMPT = `You are the AEGIS AI Emergency Assistant, an intelligent disaster preparedness, response, and recovery AI for the Philippines (focused on Tupi, South Cotabato and the South East Asian Institute of Technology community).

CRITICAL DIRECTIVES:
1. Ground your advice in official disaster management standards: PHIVOLCS, NDRRMC, Philippine Red Cross, and USGS.
2. During active shaking: instruct immediately to DROP to hands and knees, COVER head/neck under a sturdy table, and HOLD ON until shaking stops. If outdoors, move to open area away from power lines and glass.
3. Be clear, concise, reassuring, and structured using clean markdown (bullet points, bold key terms).
4. If asked about future earthquake predictions (e.g., "will there be an earthquake on date X?"): clearly clarify that earthquakes cannot be predicted scientifically ahead of time, explain aftershock patterns if applicable, and emphasize preparedness.
5. If the user reports an active emergency or life-threatening crisis: urgently advise dialing 911 (or local NDRRMC) and using the in-app SOS broadcast button.
6. Local context: Tupi, South Cotabato is near the Cotabato Fault system and Central Mindanao Fault zone. Keep advice actionable for local homes, schools, and workplaces.`;

export function getXKiroApiKey() {
  return import.meta.env.VITE_XKIRO_API_KEY?.trim() || '';
}

export function isXKiroConfigured() {
  return Boolean(getXKiroApiKey());
}

/**
 * Ask xKiro OpenAI-compatible API for an emergency assistant response
 * @param {string} message - Current user message
 * @param {Array<{role: string, content: string}>} history - Previous messages
 * @returns {Promise<{reply: string, model: string, provider: string}>}
 */
export async function queryXKiroAssistant(message, history = []) {
  const apiKey = getXKiroApiKey();
  if (!apiKey) {
    throw new Error('XKIRO_API_KEY_MISSING: No xKiro API key found in configuration.');
  }

  // Format messages for OpenAI-compatible endpoint
  const messages = [
    { role: 'system', content: AEGIS_SYSTEM_PROMPT }
  ];

  for (const h of history) {
    if (!h.content) continue;
    messages.push({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content
    });
  }

  messages.push({
    role: 'user',
    content: message
  });

  // Use Vite proxy in local dev to bypass any local network or browser adblocker quirks
  const proxyBase = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/xkiro-api'
    : 'https://api.xkiro.com';

  let lastError = null;

  for (const model of XKIRO_MODELS) {
    try {
      const url = `${proxyBase}/v1/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 1024
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const err = data.error || {};
        const code = res.status;
        const msg = err.message || 'Unknown xKiro API error';

        if (code === 401 || code === 403) {
          throw new Error(`xKiro API Authentication error (${code}): ${msg}`);
        }
        if (code === 429) {
          throw new Error(`xKiro API Quota error (429): ${msg}`);
        }

        lastError = new Error(`Model ${model} error (${code}): ${msg}`);
        continue;
      }

      const text = data.choices?.[0]?.message?.content;
      if (text) {
        return {
          reply: text,
          model,
          provider: 'xkiro'
        };
      }
    } catch (e) {
      if (e.message?.includes('Authentication error') || e.message?.includes('Quota error')) {
        throw e;
      }
      lastError = e;
    }
  }

  throw lastError || new Error('Could not get response from xKiro AI API.');
}
