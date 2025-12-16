import * as wppconnect from '@wppconnect-team/wppconnect';
import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv();

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// Fallback phone if none is provided via env
const DEFAULT_TARGET_PHONE_NUMBER = '919916515577';

const TARGET_PHONE_NUMBER = process.env.TARGET_PHONE_NUMBER || DEFAULT_TARGET_PHONE_NUMBER;
const SELLER_NAME = process.env.SELLER_NAME;
const SELLERS_SHEET_URL = process.env.SELLERS_SHEET_URL;
const SELLER_PHONES = process.env.SELLER_PHONES; // comma-separated list for multi-seller runs
const SESSION_DATA_DIR = path.resolve(__dirname, '../session-data');
const TOKEN_DIR = path.resolve(__dirname, '../tokens');

const ensureDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

ensureDir(SESSION_DATA_DIR);
ensureDir(TOKEN_DIR);
// ------------------------------------------------------------------

type ScrapedProduct = {
  id: string;
  name: string;
  description: string;
  availability: any;
  priceRaw: any;
  priceFormatted: string;
  currency: string | undefined;
  productUrl: string;
  sellerPhone: string;
  sellerName?: string;
  sellerCity?: string;
  sellerCatalogueUrl?: string;
  imageCount: number;
};

type SellerConfig = {
  phone: string;
  name?: string;
  city?: string;
  catalogueUrl?: string;
};

// Extract image count from product data (already fetched from getProducts/getCollections)
function getImageCount(product: any): number {
  let count = 0;

  // Check image_cdn_urls (from WhatsApp catalog API)
  if (product.image_cdn_urls && Array.isArray(product.image_cdn_urls)) {
    count = product.image_cdn_urls.length > 0 ? 1 : 0;
  }
  // Check additional_image_cdn_urls
  if (product.additional_image_cdn_urls && Array.isArray(product.additional_image_cdn_urls)) {
    count += product.additional_image_cdn_urls.length;
  }

  // Alternative field names used by wppconnect
  if (count === 0) {
    // Check for main image
    if (product.imageFull || product.imageUrl || product.image || product.imageHashes) {
      count = 1;
    }
    // Check additionalImages array
    if (product.additionalImages && Array.isArray(product.additionalImages)) {
      count += product.additionalImages.length;
    }
    // Check images array (some versions)
    if (product.images && Array.isArray(product.images)) {
      count = product.images.length;
    }
    // Check mediaCount if available
    if (product.mediaCount && typeof product.mediaCount === 'number') {
      count = product.mediaCount;
    }
  }

  return count;
}

// Strict iPhone detection - only actual iPhone devices, not accessories
function isIPhone(name: string, description: string): boolean {
  const nameLower = name.toLowerCase();
  const descLower = (description || '').toLowerCase();

  // Check if name contains iPhone variants
  const iphoneInName =
    /iphone|i\s*phone|i-phone/.test(nameLower) ||
    /^iph\s*\d/.test(nameLower) || // "Iph 11", "Iph 13"
    /^\d+\s*(pro|plus|max)?\s*\d*\s*gb/i.test(nameLower); // "14 Pro 256gb" style

  // Also check description for iPhone mentions
  const iphoneInDesc = /iphone|i\s*phone/.test(descLower);

  // Must have iPhone keyword somewhere
  if (!iphoneInName && !iphoneInDesc) return false;

  // If name has iPhone, check it's not primarily an accessory
  if (iphoneInName) {
    const accessoryStartPatterns = [
      /^case\b/,
      /^cover\b/,
      /^strap\b/,
      /^charger\b/,
      /^cable\b/,
      /^adapter\b/,
      /^screen\s*guard/,
      /^tempered/,
      /^protector/,
      /^airpod/,
      /^earbud/,
      /^tws\b/,
      /^speaker/,
      /^powerbank/,
      /^power\s*bank/,
    ];

    for (const pattern of accessoryStartPatterns) {
      if (pattern.test(nameLower)) return false;
    }

    return true;
  }

  // If iPhone only in description, name should look like a phone model
  if (iphoneInDesc) {
    const looksLikeModel =
      /^\d+\s*(pro|plus|max|mini)?/i.test(nameLower) ||
      /^(xs|xr|se|x)\b/i.test(nameLower) ||
      /pro\s*max/i.test(nameLower);

    if (looksLikeModel) return true;
  }

  return false;
}


function toCsvExportUrl(url: string): string {
  if (!url.includes('docs.google.com/spreadsheets')) {
    return url;
  }
  if (url.includes('/export?')) {
    return url;
  }

  const idMatch = url.match(/\/d\/([^/]+)/);
  const id = idMatch?.[1];
  if (!id) return url;

  const gidMatch = url.match(/[?#]gid=(\d+)/);
  const gid = gidMatch?.[1] ?? '0';

  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

async function fetchSellersFromSheet(sheetUrl: string): Promise<SellerConfig[]> {
  try {
    const csvUrl = toCsvExportUrl(sheetUrl);
    console.log(`Fetching sellers from Google Sheet CSV: ${csvUrl}`);
    const res = await fetch(csvUrl);
    if (!res.ok) {
      console.error(`Failed to fetch sheet: ${res.status} ${res.statusText}`);
      return [];
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      console.warn('Sheet CSV appears to have no data rows.');
      return [];
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const nameIdx = headers.findIndex((h) => h === 'name');
    const cityIdx = headers.findIndex((h) => h === 'city');
    const urlIdx = headers.findIndex(
      (h) => h === 'catalogue_link' || h === 'catalogue_url',
    );

    if (urlIdx === -1) {
      console.error(
        'Could not find a "catalogue_link" or "catalogue_url" column in the sheet headers.',
      );
      return [];
    }

    const sellerMap = new Map<string, SellerConfig>();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const rawUrl = row[urlIdx]?.trim();
      if (!rawUrl) continue;

      const match = rawUrl.match(/\/catalog\/(\d+)/);
      if (!match) continue;

      const phone = match[1];
      if (!phone) continue;

      if (!sellerMap.has(phone)) {
        const name = nameIdx !== -1 ? row[nameIdx]?.trim() : undefined;
        const city = cityIdx !== -1 ? row[cityIdx]?.trim() : undefined;
        sellerMap.set(phone, { phone, name, city, catalogueUrl: rawUrl });
      }
    }

    const sellers = Array.from(sellerMap.values());
    console.log(`Parsed ${sellers.length} unique sellers from sheet.`);
    return sellers;
  } catch (err) {
    console.error('Error fetching or parsing sellers sheet:', err);
    return [];
  }
}

async function scrapeCatalogForSeller(
  client: any,
  sellerPhone: string,
  sellerName?: string,
  sellerCity?: string,
  sellerCatalogueUrl?: string,
): Promise<ScrapedProduct[]> {
  console.log(`Fetching catalog for ${sellerPhone}...`);
  const chatId = `${sellerPhone}@c.us`;

  const allProducts = new Map<string, any>();

  const addProducts = (products: any[], source: string) => {
    if (!products || !Array.isArray(products)) return;
    products.forEach((p) => {
      if (p && p.id) {
        if (!allProducts.has(p.id)) {
          allProducts.set(p.id, { ...p, _source: source });
        }
      }
    });
  };

  console.log('Fetching products...');
  try {
    const mainList = await client.getProducts(chatId, 5000);
    console.log(`Found ${mainList?.length || 0} products in main list`);
    addProducts(mainList, 'main_list');
  } catch (e) {
    console.error('Error fetching main list:', e);
  }

  try {
    const collections = await (client as any).getCollections(chatId, 100, 100);
    if (collections && collections.length > 0) {
      console.log(`Found ${collections.length} collections`);
      for (const col of collections) {
        addProducts(col.products, `collection: ${col.name}`);
      }
    }
  } catch (e) {
    console.log('Error fetching collections:', e);
  }

  console.log(`Total unique products for ${sellerPhone}: ${allProducts.size}`);

  // Filter to only iPhone products using strict matching
  const productsArray = Array.from(allProducts.values());
  const iPhoneProducts = productsArray.filter((p) => isIPhone(p.name || '', p.description || ''));

  console.log(
    `Found ${iPhoneProducts.length} iPhone products out of ${allProducts.size} total for ${sellerPhone}`,
  );

  if (iPhoneProducts.length === 0) {
    console.log('No iPhone products found for this seller. Skipping...');
    return [];
  }

  const selectedProducts = iPhoneProducts;

  const outputList: ScrapedProduct[] = [];

  for (const p of selectedProducts) {
    const rawPrice = p.price;
    const currency = p.currency as string | undefined;
    let formattedPrice = 'N/A';

    if (rawPrice && currency) {
      const value = Number(rawPrice);
      try {
        formattedPrice = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        }).format(value / 1000);
      } catch (e) {
        formattedPrice = `${currency} ${value / 1000}`;
      }
    }

    const record: ScrapedProduct = {
      id: p.id,
      name: p.name,
      description: p.description,
      availability: p.availability,
      priceRaw: rawPrice,
      priceFormatted: formattedPrice,
      currency: currency,
      productUrl: `https://web.whatsapp.com/product/${p.id}/${sellerPhone}`,
      sellerPhone: sellerPhone,
      sellerName: sellerName,
      sellerCity: sellerCity,
      sellerCatalogueUrl: sellerCatalogueUrl,
      imageCount: getImageCount(p),
    };

    outputList.push(record);
  }

  console.log(`✓ Collected ${outputList.length} products for ${sellerPhone}`);
  return outputList;
}

async function start() {
  let client: any = null;

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Closing client...`);
    if (client) {
      try {
        await client.close();
        console.log('Client closed successfully.');
      } catch (err) {
        console.error('Error closing client:', err);
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    const lockPath = path.join(__dirname, '../session-data/SingletonLock');
    if (fs.existsSync(lockPath)) {
        try { fs.unlinkSync(lockPath); } catch (e) {}
    }

    client = await wppconnect.create({
      session: 'whatsapp-store-session',
      catchQR: (base64Qr, asciiQR) => { console.log(asciiQR); },
      logQR: false,
      statusFind: (statusSession, session) => {
        if (statusSession === 'isLogged') {
          console.log('✓ WhatsApp session active');
        } else if (statusSession === 'notLogged') {
          console.log('⚠ Please scan QR code to login');
        }
      },
      headless: true, 
      devtools: false,
      useChrome: true,
      debug: false,
      updatesLog: false,
      autoClose: 0, 
      tokenStore: 'file', 
      folderNameToken: TOKEN_DIR,
      puppeteerOptions: {
        userDataDir: SESSION_DATA_DIR,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    console.log('Client initialized. Waiting for WAPI injection...');
    await new Promise((r) => setTimeout(r, 10000));

    try {
      let sellerConfigs: SellerConfig[] = [];

      if (SELLERS_SHEET_URL) {
        sellerConfigs = await fetchSellersFromSheet(SELLERS_SHEET_URL);
      }

      if (sellerConfigs.length === 0) {
        sellerConfigs = [];

        if (SELLER_PHONES && SELLER_PHONES.trim().length > 0) {
          SELLER_PHONES.split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .forEach((phone) => {
              sellerConfigs.push({ phone });
            });
        } else {
          sellerConfigs.push({ phone: TARGET_PHONE_NUMBER, name: SELLER_NAME });
        }
      }

      const aggregatedProducts: ScrapedProduct[] = [];

      for (const seller of sellerConfigs) {
        const productsForSeller = await scrapeCatalogForSeller(
          client,
          seller.phone,
          seller.name,
          seller.city,
          seller.catalogueUrl,
        );
        aggregatedProducts.push(...productsForSeller);
      }

      const outputPath = path.join(__dirname, '../products.json');
      fs.writeFileSync(outputPath, JSON.stringify(aggregatedProducts, null, 2));
      console.log(
        `✓ Saved ${aggregatedProducts.length} products from ${sellerConfigs.length} seller(s) to ${outputPath}`,
      );
    } catch (err) {
      console.error('Error:', err);
    } finally {
        if (client) {
            await client.close();
        }
        process.exit(0);
    }

  } catch (error) {
    console.error('Initialization error:', error);
    if (client) await client.close();
    process.exit(1);
  }
}

start();
