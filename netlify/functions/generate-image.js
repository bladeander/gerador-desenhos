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
    const { prompt } = JSON.parse(event.body);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('A chave de API não está configurada no servidor.');
    
    const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    // CORREÇÃO FINAL: Prompt drasticamente simplificado para máxima estabilidade.
    const fullPrompt = `coloring book page, ${prompt}, simple, black and white, thick outlines, no words, cute, kawaii`;

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
