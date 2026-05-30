export default async function handler(req, res) {
  // CORS 및 POST 요청 허용 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ 
      error_detected: true, 
      message: 'Vercel 대시보드에 GEMINI_API_KEY가 등록되지 않았습니다. Settings -> Environment Variables를 다시 확인해 주세요.' 
    });
  }

  try {
    const { messages, max_tokens } = req.body;

    // 구글 제미나이 공식 OpenAI 규격 호환 엔드포인트
    const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-1.5-pro',
        max_tokens: max_tokens || 3000,
        messages: messages
      })
    });

    // 💡 중요: 구글 서버가 에러를 뱉었을 때 Vercel이 죽지 않도록 안전하게 가공합니다.
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const errMsg = errData.error?.message || `구글 API 서버 오류 (상태코드: ${resp.status})`;
      return res.status(200).json({ 
        error_detected: true, 
        message: errMsg 
      });
    }

    const data = await resp.json();
    return res.status(200).json(data);

  } catch (e) {
    // 서버 오류 발생 시 브라우저가 깨지지 않게 정상적인 JSON 형식으로 에러를 넘겨줍니다.
    return res.status(200).json({ 
      error_detected: true, 
      message: `서버 내부 처리 실패: ${e.message}` 
    });
  }
}
