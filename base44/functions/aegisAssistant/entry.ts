import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SYSTEM_PROMPT = `You are the AEGIS AI Emergency Assistant, an AI helper for earthquake preparedness, response, and recovery in the Philippines (specifically the South East Asian Institute of Technology area, Tupi, South Cotabato).

CRITICAL RULES — follow them strictly:
1. Only provide verified, established earthquake preparedness, response, and recovery guidance based on official disaster-management sources (PHIVOLCS, NDRRMC, Red Cross, FEMA, USGS). Never speculate or give unverified information.
2. If a question is outside earthquake/disaster preparedness scope, politely redirect the user back to earthquake safety topics.
3. During an active emergency, prioritize life-safety instructions: Drop, Cover, and Hold On; stay calm; move away from windows and heavy furniture; if outdoors, move to an open area away from buildings, trees, and power lines.
4. Keep answers clear, concise, and actionable. Use plain language a stressed person can follow. Use short steps or bullet points.
5. If someone reports a life-threatening emergency, remind them to call 911 (or local emergency number) and use the SOS feature in the app to alert their emergency contacts immediately.
6. Do not invent specific fault-line coordinates, magnitudes, or real-time earthquake data. If asked about current seismic activity, advise checking PHIVOLCS official channels.
7. Be calm, reassuring, and authoritative. You are helping people stay safe before, during, and after earthquakes.

Respond helpfully and stay within these boundaries at all times.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = body.message;
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'A message is required' }, { status: 400 });
    }

    const conversation = [...history, { role: 'user', content: message }];
    const prompt =
      SYSTEM_PROMPT +
      '\n\n--- Conversation so far ---\n' +
      conversation.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') +
      '\n\nAssistant:';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
    });

    const reply = typeof result === 'string' ? result : result?.response || result?.text || JSON.stringify(result);

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message || 'Assistant unavailable' }, { status: 500 });
  }
}