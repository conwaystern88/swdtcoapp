import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface IntelSearchRequestBody {
  query?: unknown;
  context?: {
    activePath?: unknown;
    activeCycle?: unknown;
    currentRebirth?: unknown;
    srbRank?: unknown;
  };
}

interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(
  chunks: Array<{ web?: { uri?: string; title?: string } }> | undefined
): GroundingSource[] {
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const title = chunk?.web?.title?.trim() || uri;
    sources.push({ title, uri });
  }
  return sources;
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      // Do not retry 4xx client/auth errors
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Google Search Grounded Live Intel endpoint using gemini-4-hydrogen
  app.post('/api/intel/search', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as IntelSearchRequestBody;
    const rawQuery = typeof body.query === 'string' ? body.query.trim() : '';

    if (!rawQuery) {
      res.status(400).json({ error: 'Please enter a question or droid name to search.' });
      return;
    }

    if (rawQuery.length > 400) {
      res.status(400).json({ error: 'Query is too long. Please keep searches under 400 characters.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Live Search is unavailable because GEMINI_API_KEY is not configured. Check your API key in Settings > Secrets.',
      });
      return;
    }

    const ctx = body.context ?? {};
    const activePath = Number.isFinite(Number(ctx.activePath)) ? Number(ctx.activePath) : null;
    const activeCycle = Number.isFinite(Number(ctx.activeCycle)) ? Number(ctx.activeCycle) : null;
    const currentRebirth = Number.isFinite(Number(ctx.currentRebirth))
      ? Number(ctx.currentRebirth)
      : null;
    const srbRank = Number.isFinite(Number(ctx.srbRank)) ? Number(ctx.srbRank) : null;

    const contextLine =
      activePath && activeCycle && currentRebirth
        ? `Player context: SRB Rank ${srbRank ?? 0}, Active Path ${activePath}, Cycle ${activeCycle}, currently targeting Rebirth Tier ${currentRebirth}.`
        : '';

    const prompt = [
      'Game: Star Wars Droid Tycoon (Fortnite UEFN creative island).',
      contextLine,
      `Player question: ${rawQuery}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction:
              'You are an accurate, concise live-intel reference for the Fortnite UEFN game "Star Wars Droid Tycoon". ' +
              'Always ground your answer in up-to-date Google Search results (such as droidtycoonhelper.com, community guides, wikis, and recent patch notes). ' +
              'Format your response cleanly with short scannable headings or bullet points (under 280 words unless a full table/list is requested). ' +
              'Clearly state if sources disagree or if a detail could not be verified online. Never invent game stats or fake patch notes.',
          },
        })
      );

      const text = response.text?.trim() || 'No grounded summary was returned for this query.';
      const metadata = response.candidates?.[0]?.groundingMetadata;
      const sources = extractGroundingSources(
        metadata?.groundingChunks as Array<{ web?: { uri?: string; title?: string } }> | undefined
      );
      const searchQueries = Array.isArray(metadata?.webSearchQueries)
        ? metadata.webSearchQueries.filter((q): q is string => typeof q === 'string' && q.trim() !== '')
        : [];

      res.json({
        answer: text,
        sources,
        searchQueries,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const status = (error as { status?: number })?.status;
      console.error('Gemini Search Grounding error:', errMsg);

      if (status === 403 || status === 400 || errMsg.includes('API_KEY_INVALID')) {
        res.status(status || 400).json({
          error:
            'Gemini API key was rejected or invalid. Please check your key in Settings > Secrets.',
        });
        return;
      }

      if (status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            'Rate limit or quota reached for Live Search. Please wait a moment and try again, or select a billing-enabled API key in Settings > Secrets for higher quota.',
        });
        return;
      }

      res.status(502).json({
        error: `Live Search request failed: ${errMsg}`,
      });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Wars Droid Tycoon server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
