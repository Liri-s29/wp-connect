import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config as loadEnv } from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import { EnrichedProduct } from './types';

loadEnv();

const RAW_PRODUCTS_PATH = path.join(__dirname, '../products.json');
const ENRICHED_PRODUCTS_PATH = path.join(__dirname, '../products.enriched.json');

const PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
const GLOBAL_MODEL = (process.env.LLM_MODEL || '').trim() || undefined;
const OPENAI_MODEL = process.env.OPENAI_MODEL || GLOBAL_MODEL || 'gpt-5-nano';
const GEMINI_MODEL = process.env.GEMINI_MODEL || GLOBAL_MODEL || 'gemini-2.0-flash-001';
const BATCH_SIZE = Number(process.env.LLM_BATCH_SIZE || 20);

type RawProduct = EnrichedProduct;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function loadRawProducts(): RawProduct[] {
  if (!fs.existsSync(RAW_PRODUCTS_PATH)) {
    throw new Error(`products.json not found at ${RAW_PRODUCTS_PATH}. Run "npm start" first.`);
  }

  const data = fs.readFileSync(RAW_PRODUCTS_PATH, 'utf-8');
  const parsed = JSON.parse(data);
  if (!Array.isArray(parsed)) {
    throw new Error('products.json must contain an array of products.');
  }
  return parsed as RawProduct[];
}

type EnrichmentResult = {
  id: string;
  modelName: string | null;
  storageGb: string | null;
  color: string | null;
  warranty: string | null;
  batteryHealth: string | null;
  condition: string | null;
};

function emptyResult(id: string): EnrichmentResult {
  return {
    id,
    modelName: null,
    storageGb: null,
    color: null,
    warranty: null,
    batteryHealth: null,
    condition: null,
  };
}

async function enrichBatchWithOpenAI(
  client: OpenAI,
  batch: RawProduct[],
): Promise<EnrichmentResult[]> {
  if (batch.length === 0) {
    return [];
  }

  const payload = batch.map((product) => ({
    id: product.id,
    name: product.name ?? '',
    description: product.description ?? '',
    priceRaw: product.priceRaw ?? null,
    currency: product.currency ?? null,
    availability: product.availability ?? null,
  }));

  const prompt = `
You are a product catalog normalization assistant for used/new iPhones.

IMPORTANT VALIDATION RULES:
1. ONLY process iPhone 13 through iPhone 17 series devices (including mini, Plus, Pro, Pro Max, e, and Air variants)
2. Valid models: iPhone 13/13 mini/13 Pro/13 Pro Max, iPhone 14/14 Plus/14 Pro/14 Pro Max, iPhone 15/15 Plus/15 Pro/15 Pro Max, iPhone 16/16 Plus/16 Pro/16 Pro Max/16e, iPhone 17/17 Pro/iPhone Air
3. If a product is NOT a valid iPhone 13-17 device (e.g., older models like iPhone 12, iPhone SE, or accessories like cases, chargers, cables, screen protectors, AirPods), set modelName to "EXCLUDE"

For each input product, extract:
- "modelName": Normalized model name (e.g. "iPhone 14 Pro Max"). Set to "EXCLUDE" if not a valid iPhone 13-17 device or if it's an accessory.
- "storageGb": Storage capacity with unit (e.g. "128 GB").
- "color": Short color description.
- "warranty": Short warranty description if present, else "".
- "batteryHealth": Battery health percentage if present (e.g. "85%", "90%"), else "". Note: also commonly written as "BH" or "bh".
- "condition": Product condition (e.g. "New", "Used", "Like new", "Refurbished", "Minor scratches", "Dents", "Excellent"). Extract from name/description, else "".

Return a STRICT JSON array with one element per input product, in the SAME ORDER, with keys:
["id","modelName","storageGb","color","warranty","batteryHealth","condition"].
Do not include any extra text before or after the JSON.

Products:
${JSON.stringify(payload, null, 2)}
  `.trim();

  try {
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
    });

    const text = (response as any).output_text as string | undefined;
    if (!text) {
      console.warn('LLM response had no output_text; falling back to empty enrichment.');
      return batch.map((product) => emptyResult(product.id));
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse LLM JSON output for batch:', error);
      return batch.map((product) => emptyResult(product.id));
    }

    if (!Array.isArray(parsed)) {
      console.error('LLM output is not an array; falling back to empty enrichment.');
      return batch.map((product) => emptyResult(product.id));
    }

    return batch.map((product, index) => {
      const enriched = parsed[index];
      if (!enriched || typeof enriched !== 'object') {
        return emptyResult(product.id);
      }
      return {
        id: product.id,
        modelName:
          typeof enriched.modelName === 'string' && enriched.modelName.trim().length > 0
            ? enriched.modelName
            : null,
        storageGb:
          typeof enriched.storageGb === 'string' && enriched.storageGb.trim().length > 0
            ? enriched.storageGb
            : null,
        color:
          typeof enriched.color === 'string' && enriched.color.trim().length > 0
            ? enriched.color
            : null,
        warranty:
          typeof enriched.warranty === 'string' && enriched.warranty.trim().length > 0
            ? enriched.warranty
            : null,
        batteryHealth:
          typeof enriched.batteryHealth === 'string' && enriched.batteryHealth.trim().length > 0
            ? enriched.batteryHealth
            : null,
        condition:
          typeof enriched.condition === 'string' && enriched.condition.trim().length > 0
            ? enriched.condition
            : null,
      };
    });
  } catch (error) {
    console.error('Error during LLM enrichment batch:', error);
    return batch.map((product) => emptyResult(product.id));
  }
}

async function enrichBatchWithGemini(
  client: GoogleGenAI,
  batch: RawProduct[],
): Promise<EnrichmentResult[]> {
  if (batch.length === 0) {
    return [];
  }

  const payload = batch.map((product) => ({
    id: product.id,
    name: product.name ?? '',
    description: product.description ?? '',
    priceRaw: product.priceRaw ?? null,
    currency: product.currency ?? null,
    availability: product.availability ?? null,
  }));

  const prompt = `
You are a product catalog normalization assistant for used/new iPhones.

IMPORTANT VALIDATION RULES:
1. ONLY process iPhone 13 through iPhone 17 series devices (including mini, Plus, Pro, Pro Max, e, and Air variants)
2. Valid models: iPhone 13/13 mini/13 Pro/13 Pro Max, iPhone 14/14 Plus/14 Pro/14 Pro Max, iPhone 15/15 Plus/15 Pro/15 Pro Max, iPhone 16/16 Plus/16 Pro/16 Pro Max/16e, iPhone 17/17 Pro/iPhone Air
3. If a product is NOT a valid iPhone 13-17 device (e.g., older models like iPhone 12, iPhone SE, or accessories like cases, chargers, cables, screen protectors, AirPods), set modelName to "EXCLUDE"

For each input product, extract:
- "modelName": Normalized model name (e.g. "iPhone 14 Pro Max"). Set to "EXCLUDE" if not a valid iPhone 13-17 device or if it's an accessory.
- "storageGb": Storage capacity with unit (e.g. "128 GB").
- "color": Short color description.
- "warranty": Short warranty description if present, else "".
- "batteryHealth": Battery health percentage if present (e.g. "85%", "90%"), else "". Note: also commonly written as "BH" or "bh".
- "condition": Product condition (e.g. "New", "Used", "Like new", "Refurbished", "Minor scratches", "Dents", "Excellent"). Extract from name/description, else "".

Return a STRICT JSON array with one element per input product, in the SAME ORDER, with keys:
["id","modelName","storageGb","color","warranty","batteryHealth","condition"].

Products:
${JSON.stringify(payload, null, 2)}
  `.trim();

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const responseTextRaw =
      typeof (response as any).text === 'function'
        ? (response as any).text()
        : (response as any).text;
    const text = typeof responseTextRaw === 'string' ? responseTextRaw : '';
    if (!text) {
      console.warn('Gemini response had no text; falling back to empty enrichment.');
      return batch.map((product) => emptyResult(product.id));
    }

    let jsonSnippet = text.trim();
    const fenced = text.match(/```json([\s\S]*?)```/i);
    if (fenced?.[1]) {
      jsonSnippet = fenced[1].trim();
    } else {
      const bracketMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (bracketMatch?.[1]) {
        jsonSnippet = bracketMatch[1].trim();
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonSnippet);
    } catch (error) {
      console.error('Failed to parse Gemini JSON output for batch:', error);
      return batch.map((product) => emptyResult(product.id));
    }

    if (!Array.isArray(parsed)) {
      console.error('Gemini output is not an array; falling back to empty enrichment.');
      return batch.map((product) => emptyResult(product.id));
    }

    return batch.map((product, index) => {
      const enriched = parsed[index];
      if (!enriched || typeof enriched !== 'object') {
        return emptyResult(product.id);
      }
      return {
        id: product.id,
        modelName:
          typeof enriched.modelName === 'string' && enriched.modelName.trim().length > 0
            ? enriched.modelName
            : null,
        storageGb:
          typeof enriched.storageGb === 'string' && enriched.storageGb.trim().length > 0
            ? enriched.storageGb
            : null,
        color:
          typeof enriched.color === 'string' && enriched.color.trim().length > 0
            ? enriched.color
            : null,
        warranty:
          typeof enriched.warranty === 'string' && enriched.warranty.trim().length > 0
            ? enriched.warranty
            : null,
        batteryHealth:
          typeof enriched.batteryHealth === 'string' && enriched.batteryHealth.trim().length > 0
            ? enriched.batteryHealth
            : null,
        condition:
          typeof enriched.condition === 'string' && enriched.condition.trim().length > 0
            ? enriched.condition
            : null,
      };
    });
  } catch (error) {
    console.error('Error during Gemini enrichment batch:', error);
    return batch.map((product) => emptyResult(product.id));
  }
}

async function main() {
  const rawProducts = loadRawProducts();
  console.log(`Loaded ${rawProducts.length} products from products.json`);

  let enrichBatchFn: (batch: RawProduct[]) => Promise<EnrichmentResult[]>;
  if (PROVIDER === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Please set it before running "npm run enrich" with LLM_PROVIDER=gemini.',
      );
    }
    const geminiClient = new GoogleGenAI({ apiKey });
    enrichBatchFn = (batch) => enrichBatchWithGemini(geminiClient, batch);
    console.log(`Using Gemini provider with model ${GEMINI_MODEL}`);
  } else if (PROVIDER === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Please set it before running "npm run enrich" with LLM_PROVIDER=openai.',
      );
    }
    const openAiClient = new OpenAI({ apiKey });
    enrichBatchFn = (batch) => enrichBatchWithOpenAI(openAiClient, batch);
    console.log(`Using OpenAI provider with model ${OPENAI_MODEL}`);
  } else {
    throw new Error('Invalid LLM_PROVIDER. Supported values are "openai" and "gemini".');
  }

  const batches = chunk(rawProducts, BATCH_SIZE);
  const enrichmentMap = new Map<string, EnrichmentResult>();

  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    console.log(
      `Enriching batch ${index + 1}/${batches.length} (size ${batch.length}, provider ${PROVIDER})...`,
    );
    const enriched = await enrichBatchFn(batch);
    enriched.forEach((result) => {
      enrichmentMap.set(result.id, result);
    });
  }

  const enrichedProducts: EnrichedProduct[] = rawProducts.map((product) => {
    const enriched = enrichmentMap.get(product.id) ?? emptyResult(product.id);
    return {
      ...product,
      modelName: enriched.modelName,
      storageGb: enriched.storageGb,
      color: enriched.color,
      warranty: enriched.warranty,
      batteryHealth: enriched.batteryHealth,
      condition: enriched.condition,
    };
  });

  fs.writeFileSync(ENRICHED_PRODUCTS_PATH, JSON.stringify(enrichedProducts, null, 2));
  console.log(`Saved enriched products to ${ENRICHED_PRODUCTS_PATH}`);
}

main().catch((error) => {
  console.error('Enrichment failed:', error);
  process.exit(1);
});


