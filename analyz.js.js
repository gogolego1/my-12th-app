export default async function handler(req, res) {
  // POST 요청이 아니면 차단합니다.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercel 대시보드 금고에 넣어둔 API 키를 가져옵니다.
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: '서버에 Gemini API 키가 설정되지 않았습니다. Vercel 대시보드의 Environment Variables를 확인하세요.' });
  }

  try {
    const { messages, max_tokens } = req.body;

    // 💡 핵심: 구글 제미나이 OpenAI 호환 주소 맨 끝에 ?key= 형태로 키를 명확히 결합합니다.
    const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-1.5-pro', // 기본 모델 설정
        max_tokens: max_tokens,
        messages: messages
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ 
        error: `Gemini API 내부 오류: ${data.error?.message || JSON.stringify(data)}` 
      });
    }

    // 결과를 브라우저로 안전하게 전달
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: `서버 중계 프록시 내부 오류: ${e.message}` });
  }
}