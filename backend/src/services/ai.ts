import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return client;
}

export interface AIQueryResult {
  response: string;
  confidence: number;
}

export async function queryAI(prompt: string, context?: string): Promise<AIQueryResult> {
  if (!config.anthropic.apiKey) {
    return { response: 'AI features require an Anthropic API key. Please configure it in Settings > Integrations.', confidence: 0 };
  }

  const systemPrompt = `You are UnifyIT's AI assistant for IT management. You help IT teams understand their infrastructure, costs, security posture, and operations. Be concise, actionable, and specific. When discussing costs, use actual numbers. When discussing security, prioritize by severity.${context ? `\n\nCurrent context:\n${context}` : ''}`;

  try {
    const anthropic = getClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    return {
      response: textBlock ? textBlock.text : 'No response generated.',
      confidence: message.stop_reason === 'end_turn' ? 0.9 : 0.7,
    };
  } catch (error) {
    console.error('AI query error:', error);
    return { response: 'AI service is temporarily unavailable. Please try again later.', confidence: 0 };
  }
}

export async function categorizeTicket(title: string, description: string): Promise<{ category: string; priority: string; suggestedResponse: string }> {
  const result = await queryAI(
    `Categorize this IT support ticket and suggest a response.\n\nTitle: ${title}\nDescription: ${description}\n\nRespond in JSON format: {"category": "...", "priority": "LOW|MEDIUM|HIGH|URGENT", "suggestedResponse": "..."}`
  );

  try {
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall through to defaults
  }

  return { category: 'General', priority: 'MEDIUM', suggestedResponse: '' };
}

export async function detectAnomalies(metricsContext: string): Promise<string[]> {
  const result = await queryAI(
    `Analyze these IT metrics and identify any anomalies or concerns:\n\n${metricsContext}\n\nList each anomaly as a separate line starting with "- ".`
  );

  return result.response
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.substring(2));
}

export async function getCostOptimizations(saasData: string): Promise<string[]> {
  const result = await queryAI(
    `Analyze this SaaS spending data and recommend cost optimizations:\n\n${saasData}\n\nList each recommendation as a separate line starting with "- ".`
  );

  return result.response
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.substring(2));
}

export async function naturalLanguageQuery(question: string, dataContext: string): Promise<string> {
  const result = await queryAI(
    `Answer this question about our IT environment using the provided data.\n\nQuestion: ${question}\n\nData:\n${dataContext}`
  );
  return result.response;
}
