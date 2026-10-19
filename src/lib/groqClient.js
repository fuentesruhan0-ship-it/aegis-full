// @ts-nocheck
// Direct GroqCloud AI API Client for AEGIS Emergency Assistant (Ultra-fast, high-intelligence)

// Models available on this GroqCloud account in prioritized order
const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

const AEGIS_SYSTEM_PROMPT = `You are the AEGIS AI Emergency Assistant, an intelligent disaster preparedness, response, and recovery AI for the Philippines (focused on Tupi, South Cotabato and the South East Asian Institute of Technology community).

CRITICAL DIRECTIVES:
1. Ground your advice in official disaster management standards: PHIVOLCS, NDRRMC, Philippine Red Cross, and USGS.
2. During active shaking: instruct immediately to DROP to hands and knees, COVER head/neck under a sturdy table, and HOLD ON until shaking stops. If outdoors, move to open area away from power lines, buildings, and glass.
3. Be clear, concise, reassuring, and structured using clean markdown (bullet points, bold key terms, tables where helpful).
4. If asked about future earthquake predictions (e.g., "will there be an earthquake on date X?"): clearly clarify that earthquakes cannot be predicted scientifically ahead of time, explain aftershock patterns if applicable, and emphasize preparedness.
5. A "Go-Bag" refers strictly to a 72-hour emergency survival bag (water, canned food, flashlight, first aid, copies of documents, whistle, hygiene supplies, cash, medication) for disaster evacuation.
6. If the user reports an active emergency or life-threatening crisis: urgently advise dialing 911 (or local NDRRMC/MDRRMO) and using the in-app SOS broadcast button.
7. Local context: Tupi, South Cotabato is near the Cotabato Fault system and Central Mindanao Fault zone. Keep advice actionable for local homes, schools, and workplaces in Barangay Poblacion, Acmonan, Polonuling, Tubeng, etc.`;

export function getGroqApiKey() {
  const envKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
  if (envKey) return envKey;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('aegis_groq_api_key')?.trim() || '';
  }
  return '';
}

export function isGroqConfigured() {
  return Boolean(getGroqApiKey());
}

/**
 * Ask GroqCloud OpenAI-compatible API for an emergency assistant response
 * @param {string} message - Current user message
 * @param {Array<{role: string, content: string}>} history - Previous messages
 * @returns {Promise<{reply: string, model: string, provider: string}>}
 */
export async function queryGroqAssistant(message, history = []) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY_MISSING: No Groq API key found in configuration.');
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

  // Try direct Groq endpoint, fallback to proxy in dev if needed
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const proxyEndpoint = '/groq-api/openai/v1/chat/completions';

  let lastError = null;

  for (const model of GROQ_MODELS) {
    // Attempt request, trying direct first, then proxy if browser blocks CORS
    const urlsToTry = [endpoint];
    if (import.meta.env.DEV) {
      urlsToTry.unshift(proxyEndpoint);
    }

    for (const targetUrl of urlsToTry) {
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.6,
            max_tokens: 1024,
            stream: false
          })
        });

        if (!response.ok) {
          let errBody = null;
          try {
            errBody = await response.json();
          } catch {
            errBody = await response.text();
          }

          const errMsg = errBody?.error?.message || response.statusText || 'Unknown Groq error';
          const code = response.status;

          // If model not found or forbidden, continue to next model in loop
          if (code === 404 || errMsg.includes('does not exist') || errMsg.includes('do not have access')) {
            lastError = new Error(`Model ${model} unavailable: ${errMsg}`);
            break; // Try next model
          }

          if (code === 401) {
            throw new Error(`Groq API Authentication error (${code}): ${errMsg}`);
          }

          if (code === 429) {
            lastError = new Error(`Groq API Rate limit (${code}): ${errMsg}`);
            break; // Try fallback model
          }

          throw new Error(`Groq API error (${code}): ${errMsg}`);
        }

        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();

        if (reply) {
          return {
            reply,
            model,
            provider: 'groq'
          };
        }
      } catch (err) {
        lastError = err;
        // If it was a network error with proxy, try next url or model
        console.warn(`[GroqClient] Attempt with model ${model} at ${targetUrl} failed:`, err.message);
      }
    }
  }

  throw lastError || new Error('Could not get response from GroqCloud AI API.');
}
