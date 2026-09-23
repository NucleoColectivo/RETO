import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Primary model: gemini-3.5-flash-lite for maximum speed, lowest latency and minimal token consumption
const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-2.5-flash';

app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, jsonSchema, maxTokens = 350 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const config = {
      maxOutputTokens: Math.min(Number(maxTokens) || 350, 600), // Strict token cap to avoid excess consumption
      temperature: 0.7,
      systemInstruction: 'Eres el motor de ideación de Núcleo Colectivo (Arte + Tecnología + Comunidad). Sé inspirador, conciso, directo y creativo. Evita introducciones innecesarias o rodeos.',
    };

    if (jsonSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = jsonSchema;
    }

    // Try primary model first (gemini-3.5-flash-lite)
    let response;
    let modelUsed = PRIMARY_MODEL;
    try {
      response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config,
      });
    } catch (primaryErr) {
      console.warn(`Primary model ${PRIMARY_MODEL} error, attempting fallback to ${FALLBACK_MODEL}:`, primaryErr.message);
      modelUsed = FALLBACK_MODEL;
      response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: prompt,
        config,
      });
    }

    const text = response.text || '';
    return res.json({
      text,
      model: modelUsed,
      cappedTokens: config.maxOutputTokens,
      status: 'success'
    });
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Error en el servicio de IA',
      status: 'error'
    });
  }
});

// Health / status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    model: PRIMARY_MODEL,
  });
});

// Fallback for HTML routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

