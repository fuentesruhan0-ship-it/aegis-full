// Simulates the exact flow that Assistant.jsx performs when online with Gemini configured
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
const API_KEY = process.env.API_KEY || 'YOUR_API_KEY_HERE';

const SYSTEM_PROMPT = `You are the AEGIS AI Emergency Assistant, an intelligent disaster preparedness, response, and recovery AI for the Philippines (focused on Tupi, South Cotabato and the South East Asian Institute of Technology community).

CRITICAL DIRECTIVES:
1. Ground your advice in official disaster management standards: PHIVOLCS, NDRRMC, Philippine Red Cross, and USGS.
2. During active shaking: instruct immediately to DROP to hands and knees, COVER head/neck under a sturdy table, and HOLD ON until shaking stops.
3. Be clear, concise, reassuring, and structured using clean markdown.
4. If asked about future earthquake predictions: clearly clarify that earthquakes cannot be predicted scientifically ahead of time.
5. If the user reports an active emergency: urgently advise dialing 911 and using the in-app SOS broadcast button.`;

async function testGemini() {
  console.log('=== AEGIS AI Assistant — Gemini API Integration Test ===\n');
  console.log(`API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);
  console.log(`Test Query: "june 8 2026 earthquake?"\n`);

  const requestBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: 'june 8 2026 earthquake?' }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
  };

  for (const model of GEMINI_MODELS) {
    console.log(`--- Trying model: ${model} ---`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();

      if (data.error) {
        console.log(`  ❌ Error ${data.error.code}: ${data.error.message.slice(0, 120)}`);
        
        if (data.error.code === 403) {
          console.log(`  📋 Status: PROJECT_DENIED — Key authenticates but project is restricted`);
        } else if (data.error.code === 429) {
          console.log(`  📋 Status: QUOTA_EXCEEDED — Free-tier quota set to 0`);
        } else if (data.error.code === 404) {
          console.log(`  📋 Status: MODEL_UNAVAILABLE — Model deprecated or renamed`);
        }
      } else {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          console.log(`  ✅ SUCCESS! Got live response from ${model}:`);
          console.log(`  Response preview: "${reply.replace(/\n/g, ' ').slice(0, 200)}..."`);
          console.log('\n=== RESULT: Live Gemini AI is WORKING ===');
          return;
        }
      }
    } catch (e) {
      console.log(`  ❌ Network error: ${e.message}`);
    }
    console.log('');
  }

  console.log('=== RESULT: All Gemini models returned errors ===');
  console.log('');
  console.log('What the user will see in the Assistant UI:');
  console.log('  Badge: "Online Mode - Live Gemini AI" (key IS configured)');
  console.log('  Response: ⚠️ Error notice with the exact HTTP status code');
  console.log('  + The knowledge base fallback answer appended below the notice');
  console.log('  Source label: "AI Service Notice" (red warning badge)');
  console.log('');
  console.log('To fix: Generate a new API key at https://aistudio.google.com/app/apikey');
}

testGemini();
