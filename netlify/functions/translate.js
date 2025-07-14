const fetch = require('node-fetch');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { textToTranslate } = JSON.parse(event.body);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('A chave de API não está configurada no servidor.');
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: `Translate the following text from Portuguese to English: "${textToTranslate}"` }]
      }]
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Google API Error (Translate):", errorBody);
        throw new Error('A API da Google retornou um erro na tradução.');
    }
    
    const result = await response.json();

    // Verificação de segurança para evitar erros
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const translatedText = result.candidates[0].content.parts[0].text.trim();
        return {
            statusCode: 200,
            body: JSON.stringify({ translatedText })
        };
    } else {
        console.error("Resposta inesperada da API (Translate):", JSON.stringify(result));
        throw new Error('A resposta da API de tradução não teve o formato esperado.');
    }
  } catch (error) {
    console.error("Erro na função Translate:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
