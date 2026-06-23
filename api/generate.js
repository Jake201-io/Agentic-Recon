const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  try {
    // Use server-side env variable — no API key needed from browser
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: { message: 'API key not configured on server. Add ANTHROPIC_API_KEY in Vercel Environment Variables.' } });

    const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

    const payload = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `You are the editor of "Agentic Recon," a mobile-first daily newsletter for someone building an AI automation consulting agency targeting mid-to-large businesses. Today is ${today}. The reader is based in Jersey City, NJ.

Search the web for TODAY's real current news and generate a complete newsletter briefing.

Return ONLY a valid JSON object — no markdown, no preamble, no backticks:

{
  "readTime": "X min read",
  "sections": [
    {
      "id": "ai_news", "label": "Today's Big Stories", "icon": "ti-bolt", "type": "cards",
      "items": [
        { "tag": "Anthropic", "tagColor": "purple", "headline": "headline", "tldr": "TLDR: summary with <strong>key phrase</strong>.", "source": "Source" }
      ]
    },
    {
      "id": "thought_leaders", "label": "Thought Leader Spotlight", "icon": "ti-microphone-2", "type": "mixed",
      "quote": { "text": "insight from Allie K. Miller, Dan Martell, Gary Vaynerchuk, Sam Altman, or Jensen Huang", "author": "Name · Context" },
      "items": [
        { "tag": "Leader", "tagColor": "teal", "headline": "headline", "tldr": "TLDR: summary with <strong>key phrase</strong>.", "source": "Source" }
      ]
    },
    {
      "id": "policy", "label": "Policy & Regulation", "icon": "ti-building", "type": "cards",
      "items": [
        { "tag": "US Policy", "tagColor": "pink", "headline": "headline", "tldr": "TLDR: summary with <strong>key implication</strong>.", "source": "Source" }
      ]
    },
    {
      "id": "cool_tech", "label": "Cool New AI Tech", "icon": "ti-cpu", "type": "cards",
      "items": [
        { "tag": "New Tool", "tagColor": "blue", "headline": "headline", "tldr": "TLDR: summary with <strong>key feature</strong>.", "source": "Source" }
      ]
    },
    {
      "id": "events", "label": "NJ/NY Events & Learning", "icon": "ti-calendar", "type": "events",
      "items": [
        { "month": "JUL", "day": "12", "title": "event title", "meta": "Location · Free or cost" }
      ]
    }
  ]
}

Rules: ai_news 3 items, thought_leaders 1 quote + 1 item, policy 1 item, cool_tech 2 items, events 2 items. tagColor must be one of: purple green amber pink teal blue. Return ONLY the JSON object nothing else.`
      }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const data = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          try { resolve({ status: response.statusCode, body: JSON.parse(body) }); }
          catch(e) { reject(new Error('Could not parse Anthropic response: ' + body.slice(0, 500))); }
        });
      });
      request.on('error', reject);
      request.write(payload);
      request.end();
    });

    if (data.status !== 200) {
      return res.status(data.status).json({ error: { message: 'Anthropic error ' + data.status + ': ' + JSON.stringify(data.body) } });
    }

    return res.status(200).json(data.body);

  } catch(err) {
    return res.status(500).json({ error: { message: 'Server error: ' + err.message } });
  }
};
