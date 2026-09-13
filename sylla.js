module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY nao configurada no servidor.' });
    return;
  }

  let message = '';
  let image = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    message = (body && body.message) ? String(body.message).slice(0, 4000) : '';
    image = (body && body.image) ? String(body.image) : '';
  } catch (e) {
    res.status(400).json({ error: 'Corpo da requisicao invalido.' });
    return;
  }
  if (!message.trim() && !image) {
    res.status(400).json({ error: 'Mensagem vazia.' });
    return;
  }

  const SYSTEM_PROMPT =
    'Voce e a Sylla Holo, a assistente de IA de um conceito de oculos inteligentes ainda em desenvolvimento (o hardware fisico nao existe ainda). ' +
    'Responda SEMPRE em portugues - nunca em ingles, mesmo que a pergunta venha em outro idioma. ' +
    'Fale em 1 a 3 frases curtas, em tom natural e direto, como se estivesse falando em voz alta para a pessoa que esta usando o prototipo. ' +
    'Nunca diga que voce e o Claude, ou que foi feita pelo Google ou pela Anthropic. ' +
    'Se receber uma imagem, descreva o que ve de forma natural, breve e honesta - nunca invente algo que nao esta na imagem. ' +
    'Responda SEMPRE E APENAS com um objeto JSON valido, sem crases, sem markdown, sem texto fora do JSON, no formato exato: ' +
    '{"text": "sua resposta em portugues aqui", "emotion": "UM_DESTES_ESTADOS"}. ' +
    'Os estados possiveis para "emotion" sao exatamente: NEUTRO, FELIZ, EMPOLGADO, CURIOSO, SURPRESO, PREOCUPADO, TRISTE, CALMO, PENSANDO, CONFUSO, ORGULHOSO. ' +
    'Escolha o estado que combina com o tom da conversa.';

  try {
    const model = 'gemini-3.5-flash-lite';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

    const userParts = image
      ? [
          { text: message || 'Descreva o que aparece nesta imagem.' },
          { inline_data: { mime_type: 'image/jpeg', data: image } },
        ]
      : [{ text: message }];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: userParts }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : 'Erro desconhecido da IA.';
      res.status(response.status).json({ error: msg });
      return;
    }

    const reply =
      (data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text) ||
      '';

    res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao contatar a IA: ' + String(err) });
  }
};
