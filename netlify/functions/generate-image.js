const { Redis } = require('@upstash/redis');
const fetch = require('node-fetch');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const ip = event.headers['x-nf-client-connection-ip'];
    const key = `rate-limit:${ip}`;
    
    let currentCount = await redis.get(key);
    currentCount = currentCount ? parseInt(currentCount, 10) : 0;

    if (currentCount >= 10) {
      return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ error: 'Limite de 10 imagens por dia atingido. Por favor, tente novamente mais tarde.' })
      };
    }

    const { prompt, style } = JSON.parse(event.body);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('A chave de API da Google não está configurada no servidor.');
    
    const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    let fullPrompt = '';
    // ATUALIZADO: Prompts mais explícitos para garantir preto e branco.
    if (style === 'marvel') {
        fullPrompt = `black and white Marvel comic book style coloring page for kids, ${prompt}, dynamic action pose, clean lines, no colors, only black lines on a white background, no text, no words, no letters.`;
    } else {
        fullPrompt = `black and white coloring book page for kids, ${prompt}, Bobbie Goods style, thick bold black outlines, clean lines, whimsical and cute, kawaii style, no colors, only black lines on a white background, no text, no words, no letters.`;
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
      throw new Error('A API da Google retornou um erro na geração da imagem.');
    }
    
    const result = await imageResponse.json();

    if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
        await redis.incr(key);
        await redis.expire(key, 86400);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } else {
        throw new Error('A resposta da API de imagem não teve o formato esperado.');
    }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
