
const { getDeployStore } = require('@netlify/blobs');
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
    // LÓGICA DE CONTROLO POR IP
    const ip = event.headers['x-nf-client-connection-ip'];
    const store = getDeployStore('rate-limit-store');
    const ipData = await store.get(ip, { type: 'json' }) || { count: 0, timestamp: 0 };

    const twentyFourHours = 24 * 60 * 60 * 1000;
    const isOverTimeLimit = Date.now() - ipData.timestamp > twentyFourHours;

    if (isOverTimeLimit) {
      // Reinicia o contador se já passaram 24 horas
      ipData.count = 0;
      ipData.timestamp = Date.now();
    }

    if (ipData.count >= 10) {
      // Bloqueia o pedido se o limite for atingido
      return {
          statusCode: 429, // Too Many Requests
          headers,
          body: JSON.stringify({ error: 'Limite de 10 imagens por dia atingido. Por favor, tente novamente em 24 horas.' })
      };
    }

    // LÓGICA DE GERAÇÃO DE IMAGEM
    const { prompt, style } = JSON.parse(event.body);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('A chave de API não está configurada no servidor.');
    
    const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    let fullPrompt = '';
    if (style === 'marvel') {
        fullPrompt = `Marvel comic book style coloring page for kids, ${prompt}, dynamic action pose, clean lines, black and white, no words, no text, no letters.`;
    } else {
        fullPrompt = `coloring book page for kids, thick bold black outlines, clean lines, whimsical and cute, kawaii style, no text, no words, no letters. Theme: ${prompt}`;
    }

    const imagePayload = {
      instances: [{ prompt: fullPrompt }],
      parameters: { sampleCount: 1 }
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
        // Incrementa o contador e guarda no armazenamento
        ipData.count++;
        await store.setJSON(ip, ipData);

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
