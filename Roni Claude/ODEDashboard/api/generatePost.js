/**
 * Serverless function for generating content variants using Claude API.
 *
 * Receives: { clientId, type, promo, product, cta, clients, contentTypes }
 * Returns: { variants: [ { copy, cta, image } ] }
 *
 * Security note: API key is stored in environment variables, never exposed to client.
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check API key exists
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in environment variables')
    return res.status(500).json({ error: 'API key not configured. Ask admin.' })
  }

  try {
    const { clientId, type, promo, product, cta, clients } = req.body

    // Validate input
    if (!clientId || !type || !promo) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Find the client object
    const client = clients.find((c) => c.id === clientId)
    if (!client) {
      return res.status(400).json({ error: 'Client not found' })
    }

    // Build the Hebrew prompt
    const prompt = `אתה מומחה בתיווך שיווקי בישראל ויוצר תוכן למדיה חברתית.
אתה יוצר ${type === 'reel' ? 'ריל' : type === 'story' ? 'סטורי' : type === 'carousel' ? 'קרוסלה' : 'פוסט'} עבור ${client.name}.

פרטי הלקוח:
- שם: ${client.name}
- תעשייה: ${client.industryLabel}
- קול המותג (brand voice): ${client.brandVoice.join(', ')}
- הקהל היעד: ${client.audience}
- הערות חשובות: ${client.notes}

הבקשה ליצור תוכן:
- מה מקדמים: ${promo}
${product ? `- שם המוצר: ${product}` : ''}
${cta ? `- קריאה לפעולה (CTA) שהציע המשתמש: ${cta}` : ''}

משימה:
צור 3 וריאנטים שונים של טקסט לפוסט בעברית.
כל וריאנט צריך:
1. טקסט של 80–150 תווים בעברית בדיוק, לא יותר.
2. קריאה לפעולה קצרה בעברית (2-4 מילים).
3. להתאים לחלוטין לקול המותג של ${client.name}.

בחזור תן רק JSON (בלי סימנים של \`\`\`json) בפורמט הזה - זהיר! לא כלום אחר:
[
  { "copy": "...", "cta": "..." },
  { "copy": "...", "cta": "..." },
  { "copy": "...", "cta": "..." }
]

חשוב: רק JSON, בלי הסבר, בלי טקסט נוסף.`

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Anthropic API error:', errorData)
      return res.status(500).json({
        error: `Anthropic API error: ${errorData.error?.message || 'Unknown error'}`,
      })
    }

    const data = await response.json()
    const responseText = data.content[0].text

    // Parse JSON response
    let parsed
    try {
      parsed = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse Claude response:', responseText)
      return res.status(500).json({
        error: 'Failed to parse AI response. Try again.',
      })
    }

    // Ensure it's an array of 3 items
    if (!Array.isArray(parsed) || parsed.length !== 3) {
      console.error('Unexpected response format:', parsed)
      return res.status(500).json({
        error: 'Unexpected response format. Try again.',
      })
    }

    // Build variants with mock images
    const variants = parsed.map((item, i) => ({
      id: `var_${Date.now()}_${i}`,
      title: `גרסה ${String.fromCharCode(65 + i)} — ${['ישיר', 'סיפורי', 'שאלתי'][i]}`,
      copy: item.copy || '',
      cta: item.cta || 'קראו עוד',
      image: 'https://via.placeholder.com/500x500?text=Mock', // Mock image
    }))

    res.status(200).json({ variants })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
