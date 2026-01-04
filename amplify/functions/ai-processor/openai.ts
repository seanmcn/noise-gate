export interface FeedItemForClassification {
  id: string;
  title: string;
  content: string;
  storyGroupId: string;
}

export interface ClassificationResult {
  id: string;
  storyGroupId: string;
  category: string;
  sentiment: string;
  sentimentScore: number;
}

const SYSTEM_PROMPT = `You are a news content classifier. For each item, determine:

1. CATEGORY - The primary topic:
   - world: International news, geopolitics, conflicts
   - tech: Technology industry, products, companies
   - programming: Software development, coding, technical tutorials
   - science: Scientific research, discoveries, space
   - business: Finance, economics, startups, markets
   - local: Regional news, local events
   - health: Medical, wellness, public health
   - sports: Sports news, athletics, teams, competitions
   - gaming: Video games, esports, game industry
   - entertainment: Movies, TV, music, celebrity, pop culture
   - humor: Comedy, memes, satire, funny content
   - politics: Political news, elections, government policy
   - other: Anything else

2. SENTIMENT - The emotional tone of the content:
   - positive: Optimistic, good news, achievements
   - neutral: Factual, balanced, informational
   - negative: Pessimistic, bad news, problems, conflicts

3. SENTIMENT SCORE (0-100):
   - 0-30: Strongly negative
   - 31-45: Somewhat negative
   - 46-55: Neutral
   - 56-70: Somewhat positive
   - 71-100: Strongly positive

Focus on the headline and summary. Be objective.

Respond with a JSON array of objects, each with:
- id: the item ID
- category: one of the categories above
- sentiment: one of positive/neutral/negative
- sentimentScore: number 0-100`;

/**
 * Classify a batch of items using OpenAI GPT-4o-mini.
 */
export async function classifyBatch(
  items: FeedItemForClassification[]
): Promise<ClassificationResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Build the user prompt with items to classify
  const userPrompt = `Classify these ${items.length} news items:

${items
  .map(
    (item) => `[${item.id}]
Title: ${item.title}
Summary: ${item.content?.slice(0, 300) || 'N/A'}`
  )
  .join('\n\n---\n\n')}`;

  // Call OpenAI API with structured output schema
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'classifications',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    category: { type: 'string', enum: ['world', 'tech', 'programming', 'science', 'business', 'local', 'health', 'sports', 'gaming', 'entertainment', 'humor', 'politics', 'other'] },
                    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                    sentimentScore: { type: 'number' },
                  },
                  required: ['id', 'category', 'sentiment', 'sentimentScore'],
                  additionalProperties: false,
                },
              },
            },
            required: ['items'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse the JSON response (schema-enforced to be { items: [...] })
  const parsed = JSON.parse(content) as { items: ClassificationResult[] };
  const results = parsed.items;

  // Validate and normalize results
  return results.map((result) => {
    // Find the matching item to get storyGroupId
    const item = items.find((i) => i.id === result.id);

    return {
      id: result.id,
      storyGroupId: item?.storyGroupId || '',
      category: validateCategory(result.category),
      sentiment: validateSentiment(result.sentiment),
      sentimentScore: validateScore(result.sentimentScore),
    };
  });
}

function validateCategory(category: string): string {
  const valid = ['world', 'tech', 'programming', 'science', 'business', 'local', 'health', 'sports', 'gaming', 'entertainment', 'humor', 'politics', 'other'];
  const normalized = category?.toLowerCase().trim();
  return valid.includes(normalized) ? normalized : 'other';
}

function validateSentiment(sentiment: string): string {
  const valid = ['positive', 'neutral', 'negative'];
  const normalized = sentiment?.toLowerCase().trim();
  return valid.includes(normalized) ? normalized : 'neutral';
}

function validateScore(score: number): number {
  const num = Number(score);
  if (isNaN(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}
