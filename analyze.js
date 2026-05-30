export default async function handler(req, res) {
  // POST 요청이 아니면 차단합니다.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercel 대시보드에 설정할 환경변수에서 API 키를 가져옵니다.
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: '서버에 Gemini API 키가 설정되지 않았습니다. Vercel 대시보드의 Environment Variables를 확인하세요.' });
  }

  try {
    const { contents, modelName } = req.body;

    // 구글 Gemini API 호출 주소 (서버 단에서 API 키를 결합)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contents })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ 
        error: `Gemini API 오류: ${data.error?.message || JSON.stringify(data)}` 
      });
    }

    // 최종 연산 결과를 브라우저로 안전하게 전달
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: `서버 프록시 내부 오류: ${e.message}` });
  }
}