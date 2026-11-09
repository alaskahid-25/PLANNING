import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// AI Management Summary Endpoint
app.post('/api/gemini/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { contextData } = req.body;
    if (!aiClient) {
      res.status(200).json({
        fallback: true,
        message: 'No Gemini API Key configured in environment. Using rule-based management summary engine.',
      });
      return;
    }

    const prompt = `You are the Senior Manufacturing ERP & Production Planning AI Consultant for a cooking oil manufacturing enterprise.
Analyze the following production planning, material requirements, stock position, shortages, and procurement data:
${JSON.stringify(contextData, null, 2)}

Provide an authoritative executive management report in structured professional markdown with the following exact numbered sections:
1. Overall Production Readiness
2. Total Planned Production & SKU Overview
3. Materials with Sufficient Stock
4. Critical Material Shortages (Highlight production halt risks)
5. High-Priority Purchase Requirements
6. Procurement Lead-Time Risks & Release Dates
7. Excess Inventory Observations & Capital Tied Up
8. Estimated Material Cost & Budget Impact
9. Recommended Immediate Actions (Today's prioritized checklist for Plant Head, Stores, Procurement, and Finance)

Use exact numbers, material codes, and units from the data. Do NOT fabricate or invent figures. Maintain an executive, clear, boardroom-ready tone.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an expert production planning and inventory intelligence system for cooking oil manufacturing plants. You analyze real ERP data and provide precise, actionable operational intelligence.',
      },
    });

    res.status(200).json({
      success: true,
      summary: response.text,
    });
  } catch (error: any) {
    console.error('Gemini summary error:', error);
    res.status(500).json({ error: error.message || 'Error generating AI summary' });
  }
});

// AI Q&A Assistant Endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, contextData } = req.body;
    if (!aiClient) {
      res.status(200).json({
        fallback: true,
        answer: 'Operating in local offline intelligence mode. Gemini API Key is not set in environment.',
      });
      return;
    }

    const prompt = `Context of current cooking oil production plan, inventory status, and procurement plan:
${JSON.stringify(contextData, null, 2)}

User Question from Management: "${question}"

Provide a direct, factual, executive-level answer based STRICTLY on the data above.
If any required detail (such as rate or stock) is missing or not provided in the data, explicitly state that it is unavailable. Never guess or invent numbers.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an AI production planner and stores consultant. Give concise, accurate, data-backed answers with exact SKU and RM codes.',
      },
    });

    res.status(200).json({
      success: true,
      answer: response.text,
    });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ error: error.message || 'Error processing AI chat' });
  }
});

// Mount Vite or serve static
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Smart Production Planner AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
