const fetch = require('node-fetch');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { prompt } = JSON.parse(event.body);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('A chave de API não está configurada no servidor.');
    const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const stylePrompt = "A whimsical and cute coloring book page for kids. Use thick bold black outlines and clean lines. The scene should be clear and simple, with a few large main elements and plenty of space for coloring.";
    const rulesPrompt = "MOST IMPORTANT RULE: The drawing MUST NOT contain any words, letters, numbers, or text of any kind. NO TEXT. NO WRITING. NO LETTERS. The image must be purely visual, with no characters or symbols.";
    const fullPrompt = `${stylePrompt} The theme is: ${prompt}. ${rulesPrompt}`;
    const imagePayload = {
      instances: [{ 
        prompt: fullPrompt,
        negative_prompt: "text, words, letters, writing, captions, labels, signs, alphabet, numbers, characters, script, font, typography, logo, watermark, signature, brand name"
      }],
      parameters: { "sampleCount": 1 }
    };
    const imageResponse = await fetch(imageApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imagePayload)
    });
    if (!imageResponse.ok) throw new Error('A API da Google retornou um erro na geração da imagem.');
    const result = await imageResponse.json();
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
