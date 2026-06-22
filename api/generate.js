export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const body = await req.json();
    const apiKey = body.apiKey;

    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return new Response(JSON.stringify({ error: { message: 'Invalid API key format. Must start with sk-ant-' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

    const prompt = `You are the editor of "Agentic Recon," a mobile-first daily newsletter for someone building an AI automation consulting agency targeting mid-to-large businesses. Today is ${today}. The reader is based in Jersey City, NJ.

Search the web for TODAY's real, current news and generate a complete newsletter briefing.

Return ONLY a valid JSON object — no markdown, no preamble, no backticks:

{
  "readTime": "X min read",
  "sections": [
    {
      "id": "ai_news",
      "label": "Today's Big Stories",
      "icon": "ti-bolt",
      "type": "cards",
      "items": [
        { "tag": "Anthropic", "tagColor": "purple", "headline": "headline here", "tldr": "TLDR: one to two sentence summary with <strong>key phrase bolded</strong>.", "source": "Source Name" }
      ]
    },
    {
      "id": "thought_leaders",
      "label": "Thought Leader Spotlight",
      "icon": "ti-microphone-2",
      "type": "mixed",
      "quote": { "text": "a real or paraphrased insight from Allie K. Miller, Dan Martell, Gary Vaynerchuk, Sam Altman, Jensen Huang, or another top AI automation voice", "author": "Name · Context" },
      "items": [
        { "tag": "Leader Name", "tagColor": "teal", "headline": "headline", "tldr": "TLDR: summary with <strong>key phrase</strong>.", "source": "Source" }
      ]
    },
    {
      "id": "policy",
      "label": "Policy & Regulation",
      "icon": "ti-building",
      "type": "cards",
      "items": [
        { "tag": "US Policy", "tagColor": "pink", "headline": "headline", "tldr": "TLDR: why this matters to an AI consultant with <strong>key implication bolded</strong>.", "source": "Source" }
      ]
    },
    {
      "id": "cool_tech",
      "label": "Cool New AI Tech",
      "icon": "ti-cpu",
      "type": "cards",
      "items": [
        { "tag": "New Tool", "tagColor": "blue", "headline": "headline", "tldr": "TLDR: what it does and why it matters with <strong>key feature bolded</strong>.", "source": "Source" }
      ]
    },
    {
      "id": "events",
      "label": "NJ/NY Events & Learning",
      "icon": "ti-calendar",
      "type": "events",
      "items": [
        { "month": "JUL", "day": "12", "title": "event title", "meta": "Location · Free or cost" }
      ]
    }
  ]
}

Strict rules:
- ai_news: exactly 3 stories about Anthropic, OpenAI, Nvidia, Meta, Amazon, Google in the agentic AI space
- thought_leaders: 1 quote + 1 article
- policy: 1 item about AI regulation or legislation affecting enterprise AI  
- cool_tech: 2 new AI tools or agent frameworks
- events: 2 upcoming AI/automation events in NJ, NYC, or online
- tagColor must be one of: purple, green, amber, pink, teal, blue
- All tldr values must be 1-2 sentences max
- Return ONLY the JSON object, nothing else`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const rawText = await anthropicRes.text();

    // Always return the raw response so the frontend can debug it
    let data;
    try {
      data = JSON.parse(rawText);
    } catch(e) {
      return new Response(JSON.stringify({ 
        error: { message: 'RAW RESPONSE FROM ANTHROPIC: ' + rawText }
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!anthropicRes.ok) {
      return new Response(JSON.stringify({ 
        error: { message: 'Anthropic error ' + anthropicRes.status + ': ' + (data?.error?.message || rawText) }
      }), {
        status: anthropicRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: 'Server error: ' + err.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
