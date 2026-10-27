// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateText } from 'ai';
import { createAIModel } from './providers';

// A live check against Ollama Cloud through the app's own provider factory.
// Skipped unless OLLAMA_API_KEY is set. Run it by hand:
//   OLLAMA_API_KEY=... corepack yarn vitest run app/api/ai/ollama-live.test.ts
const apiKey = process.env.OLLAMA_API_KEY;

describe.skipIf(!apiKey)('Ollama Cloud (live)', () => {
  it('answers a chat request', async () => {
    const model = createAIModel({ provider: 'ollama', apiKey: apiKey!, baseUrl: 'https://ollama.com', modelKey: 'gemma4:31b' });
    const { text } = await generateText({ model, prompt: 'Reply with one short sentence saying hello.' });
    console.log('Ollama reply:', text);
    expect(text.trim().length).toBeGreaterThan(0);
  }, 60_000);
});
