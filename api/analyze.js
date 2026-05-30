export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      error_detected: true,
      message: 'Vercel 대시보드에 GEMINI_API_KEY가 등록되지 않았습니다. Settings → Environment Variables를 확인해 주세요.'
    });
  }

  try {
    const { messages, max_tokens } = req.body;

    // OpenAI 형식 → Gemini 네이티브 형식 변환
    const geminiContents = messages.map(msg => {
      const parts = Array.isArray(msg.content)
        ? msg.content.map(part => {
            if (part.type === 'text') {
              return { text: part.text };
            }
            if (part.type === 'image_url') {
              const url = part.image_url.url;
              const matches = url.match(/^data:(.+);base64,(.+)$/);
              if (matches) {
                return {
                  inline_data: {
                    mime_type: matches[1],
                    data: matches[2]
                  }
                };
              }
            }
            return { text: '' };
          })
        : [{ text: msg.content }];

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: { maxOutputTokens: max_tokens || 3000 }
      })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const errMsg = errData.error?.message || `구글 API 서버 오류 (상태코드: ${resp.status})`;
      return res.status(200).json({ error_detected: true, message: errMsg });
    }

    const data = await resp.json();

    // Gemini 응답 → OpenAI 형식으로 변환
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({
      choices: [{ message: { content: text } }]
    });

  } catch (e) {
    return res.status(200).json({
      error_detected: true,
      message: `서버 내부 처리 실패: ${e.message}`
    });
  }
}
