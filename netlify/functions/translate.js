const fetch = require('node-fetch');

exports.handler = async function(event) {
  // Cabeçalhos de permissão (CORS) para permitir chamadas do seu site
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
    const { textToTranslate } = JSON.parse(event.body);
    if (!textToTranslate) {
      throw new Error("Nenhum texto fornecido para tradução.");
    }

    // Constrói o URL para a API de tradução gratuita MyMemory
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=pt|en`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("O serviço de tradução gratuito retornou um erro.");
    }

    const result = await response.json();

    // Extrai o texto traduzido da resposta da API
    if (result.responseData && result.responseData.translatedText) {
      const translatedText = result.responseData.translatedText;
      return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ translatedText })
      };
    } else {
      throw new Error("Não foi possível extrair o texto traduzido da resposta da API.");
    }
  } catch (error) {
    console.error("Erro na função Translate:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
