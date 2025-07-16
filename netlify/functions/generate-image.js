const fetch = require('node-fetch');

exports.handler = async function(event) {
  // Cabeçalhos de permissão (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Responde ao pedido "preflight" do navegador
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }
  try {
    // Obtém o prompt e o estilo do pedido
    const { prompt, style } = JSON.parse(event.body);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('A chave de API não está configurada no servidor.');
    
    const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    let fullPrompt = '';

    // Define o prompt com base no estilo escolhido
    if (style === 'herois') {
        fullPrompt = `Superhero comic book style coloring page for kids, ${prompt}, dynamic action pose, clean lines, black and white, no words, no text, no letters.`;
    } else { // O padrão é Bobbie Goods
        fullPrompt = `A Bobbie Goods style coloring page. Featuring cute, chubby animal characters with simple, dot-like eyes. The scene should be filled with many small, charming objects related to the theme: ${prompt}. Use thick, bold, slightly imperfect black outlines. Whimsical, cozy, and kawaii aesthetic. Strictly black and white, no colors, no text.`;
    }

    const imagePayload = {
      instances: [
        { 
          prompt: fullPrompt
        }
      ],
      parameters: {
        sampleCount: 1
      }
    };

    const imageResponse = await fetch(imageApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imagePayload)
    });

    if (!imageResponse.ok) {
      const errorBody = await imageResponse.text();
      console.error("Google API Error (Image):", errorBody);
      throw new Error('A API da Google retornou um erro na geração da imagem.');
    }
    
    const result = await imageResponse.json();

    if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } else {
        console.error("Resposta inesperada da API (Image):", JSON.stringify(result));
        throw new Error('A resposta da API de imagem não teve o formato esperado.');
    }
  } catch (error) {
    console.error("Erro na função Generate-Image:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
