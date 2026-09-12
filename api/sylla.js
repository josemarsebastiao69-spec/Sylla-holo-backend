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
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    message = (body && body.message) ? String(body.message).slice(0, 1000) : '';
  } catch (e) {
    res.status(400).json({ error: 'Corpo da requisicao invalido.' });
    return;
  }
  if (!message.trim()) {
    res.status(400).json({ error: 'Mensagem vazia.' });
    return;
  }

  const SYSTEM_PROMPT =
    'Voce e a Sylla Holo, a assistente de IA de um conceito de oculos inteligentes ainda em ' +
    'desenvolvimento (o hardware fisico nao existe ainda). Responda sempre em portugues do ' +
    'Brasil, em 1 a 3 frases curtas, em tom natural e direto, como se estivesse falando em ' +
    'voz alta para a pessoa que esta usando o prototipo. Nunca diga que voce e o Gemini, o ' +
    'Claude, ou que foi feita pelo Google ou pela Anthropic.';

  try {
    const model = 'gemini-2.5-flash';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 200 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: (data && data.error && data.error.message) || 'Erro ao chamar a API do Gemini.' });
      return;
    }

    const reply = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) || 'Nao consegui gerar uma resposta agora.';
    res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao contatar a IA: ' + String(err) });
  }
};
