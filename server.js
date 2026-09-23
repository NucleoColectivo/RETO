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

app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, jsonSchema } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const config = {};
    if (jsonSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = jsonSchema;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      ...(Object.keys(config).length > 0 ? { config } : {}),
    });

    const text = response.text || '';
    return res.json({ text });
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Error generating content with Gemini',
    });
  }
});

// Fallback for HTML routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
