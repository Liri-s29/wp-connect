import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';

import prisma from './db/client';
import { EnrichedProduct } from './types';

type ChangeType = 'CREATED' | 'UPDATED' | 'REACTIVATED' | 'UNCHANGED';

type PendingProduct = {
  input: EnrichedProduct;
  existing:
    | Awaited<ReturnType<typeof prisma.product.findUnique>>
    | null;
  changeType: ChangeType;
  dataHash: string;
};

function computeDataHash(p: EnrichedProduct): string {
  const base = [
    p.id ?? '',
    p.name ?? '',
    p.description ?? '',
    p.priceRaw !== undefined && p.priceRaw !== null ? String(p.priceRaw) : '',
    p.availability !== undefined && p.availability !== null
      ? String(p.availability)
      : '',
    p.currency ?? '',
  ].join('|');

  return crypto.createHash('sha256').update(base).digest('hex');
}

function buildSnapshot(args: {
  productRow: {
    id: string;
    sellerPhone: string;
    rawName: string | null;
    rawDescription: string | null;
    priceRaw: any;
    currency: string | null;
    availability: string | null;
    modelName: string | null;
    storageGb: string | null;
    color: string | null;
    warranty: string | null;
    batteryHealth: string | null;
    dataHash: string | null;
    isActive: boolean;
    firstSeenAt: Date;
    lastSeenAt: Date;
    lastModifiedAt: Date | null;
  };
  productUrl?: string | null;
  sellerName?: string;
  sellerCity?: string;
  sellerCatalogueUrl?: string;
}) {
  const { productRow, productUrl, sellerName, sellerCity, sellerCatalogueUrl } = args;
  return {
    id: productRow.id,
    sellerPhone: productRow.sellerPhone,
    sellerName: sellerName ?? null,
    sellerCity: sellerCity ?? null,
    sellerCatalogueUrl: sellerCatalogueUrl ?? null,
    rawName: productRow.rawName,
    rawDescription: productRow.rawDescription,
    priceRaw: productRow.priceRaw ?? null,
    currency: productRow.currency,
    availability: productRow.availability,
    productUrl: productUrl ?? null,
    modelName: productRow.modelName,
    storageGb: productRow.storageGb,
    color: productRow.color,
    warranty: productRow.warranty,
    batteryHealth: productRow.batteryHealth,
    dataHash: productRow.dataHash,
    isActive: productRow.isActive,
    firstSeenAt: productRow.firstSeenAt,
    lastSeenAt: productRow.lastSeenAt,
    lastModifiedAt: productRow.lastModifiedAt,
  };
}

async function loadEnrichedProducts(): Promise<EnrichedProduct[]> {
  const productsPath = path.join(__dirname, '../products.enriched.json');
  if (!fs.existsSync(productsPath)) {
    throw new Error(
      `products.enriched.json not found at ${productsPath}. Run "npm run enrich" before processing.`,
    );
  }

  const raw = fs.readFileSync(productsPath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('products.enriched.json must be an array of product objects.');
  }

  return parsed as EnrichedProduct[];
}

function computeChangesForSeller(
  inputs: EnrichedProduct[],
  existingById: Map<string, Awaited<ReturnType<typeof prisma.product.findUnique>>>,
): { pending: PendingProduct[]; productsFound: number; productsNew: number; productsUpdated: number } {
  const pending: PendingProduct[] = [];
  let productsNew = 0;
  let productsUpdated = 0;

  for (const input of inputs) {
    const dataHash = computeDataHash(input);

    const existing = existingById.get(input.id) ?? null;

    if (!existing) {
      pending.push({
        input,
        existing: null,
        changeType: 'CREATED',
        dataHash,
      });
      productsNew += 1;
      continue;
    }

    if (existing.dataHash === dataHash && existing.isActive) {
      pending.push({
        input,
        existing,
        changeType: 'UNCHANGED',
        dataHash,
      });
      continue;
    }

    const wasInactive = !existing.isActive;
    const changeType: ChangeType = wasInactive ? 'REACTIVATED' : 'UPDATED';

    pending.push({
      input,
      existing,
      changeType,
      dataHash,
    });

    productsUpdated += 1;
  }

  return {
    pending,
    productsFound: inputs.length,
    productsNew,
    productsUpdated,
  };
}

async function processSellerGroup(
  sellerPhone: string,
  inputs: EnrichedProduct[],
  scanTime: Date,
  sellerNameFromConfig?: string,
  sellerCityFromConfig?: string,
  sellerCatalogueUrlFromConfig?: string,
) {
  const basicSellerName =
    sellerNameFromConfig ||
    inputs.find((p) => p.sellerName && p.sellerName.trim().length > 0)?.sellerName ||
    null;
  const basicSellerCity =
    sellerCityFromConfig ||
    inputs.find((p) => p.sellerCity && p.sellerCity.trim().length > 0)?.sellerCity ||
    null;
  const basicSellerCatalogueUrl =
    sellerCatalogueUrlFromConfig ||
    inputs.find((p) => p.sellerCatalogueUrl && p.sellerCatalogueUrl.trim().length > 0)?.sellerCatalogueUrl ||
    null;

  await prisma.seller.upsert({
    where: { phoneNumber: sellerPhone },
    create: {
      phoneNumber: sellerPhone,
      name: basicSellerName,
      city: basicSellerCity,
      catalogueUrl: basicSellerCatalogueUrl,
      isActive: true,
    },
    update: {
      name: basicSellerName ?? undefined,
      city: basicSellerCity ?? undefined,
      catalogueUrl: basicSellerCatalogueUrl ?? undefined,
      isActive: true,
    },
  });

  const ids = inputs.map((p) => p.id);
  const existingProducts = await prisma.product.findMany({
    where: {
      id: { in: ids },
    },
  });
  const existingById = new Map<string, (typeof existingProducts)[number]>();
  for (const p of existingProducts) {
    existingById.set(p.id, p);
  }

  const {
    pending,
    productsFound,
    productsNew,
    productsUpdated,
  } = computeChangesForSeller(inputs, existingById);

  const seenIds = new Set<string>();
  for (const item of pending) {
    seenIds.add(item.input.id);
  }

  // Batch operations to avoid transaction timeout
  const DB_BATCH_SIZE = 500;
  const batches: typeof pending[] = [];
  for (let i = 0; i < pending.length; i += DB_BATCH_SIZE) {
    batches.push(pending.slice(i, i + DB_BATCH_SIZE));
  }

  // Process each batch in its own transaction with timeout
  for (const batch of batches) {
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        for (const item of batch) {
          const { input, existing, changeType, dataHash } = item;

          if (changeType === 'UNCHANGED' && existing) {
            await tx.product.update({
              where: { id: input.id },
              data: {
                lastSeenAt: scanTime,
                isActive: true,
              },
            });
            continue;
          }

          // Convert priceRaw to number for Decimal field (divide by 1000 for WhatsApp's micro-currency)
          const priceRawValue = input.priceRaw != null ? Number(input.priceRaw) / 1000 : null;

          let productRow =
            existing ??
            (await tx.product.create({
              data: {
                id: input.id,
                sellerPhone,
                rawName: input.name ?? null,
                rawDescription: input.description ?? null,
                priceRaw: priceRawValue,
                currency: input.currency ?? null,
                availability: input.availability ?? null,
                dataHash,
                isActive: true,
                firstSeenAt: scanTime,
                lastSeenAt: scanTime,
                lastModifiedAt: scanTime,
                modelName: input.modelName ?? null,
                storageGb: input.storageGb ?? null,
                color: input.color ?? null,
                warranty: input.warranty ?? null,
                batteryHealth: input.batteryHealth ?? null,
              },
            }));

          const dataChanged =
            !!existing && !!existing.dataHash && existing.dataHash !== dataHash;

          if (existing) {
            productRow = await tx.product.update({
              where: { id: input.id },
              data: {
                sellerPhone,
                rawName: input.name ?? null,
                rawDescription: input.description ?? null,
                priceRaw: priceRawValue,
                currency: input.currency ?? null,
                availability: input.availability ?? null,
                dataHash,
                isActive: true,
                firstSeenAt: existing.firstSeenAt,
                lastSeenAt: scanTime,
                lastModifiedAt: dataChanged
                  ? scanTime
                  : existing.lastModifiedAt ?? null,
                modelName: input.modelName ?? null,
                storageGb: input.storageGb ?? null,
                color: input.color ?? null,
                warranty: input.warranty ?? null,
                batteryHealth: input.batteryHealth ?? null,
              },
            });
          }

          const snapshot = buildSnapshot({
            productRow,
            productUrl: input.productUrl,
            sellerName: input.sellerName ?? basicSellerName ?? undefined,
            sellerCity: input.sellerCity ?? basicSellerCity ?? undefined,
            sellerCatalogueUrl: input.sellerCatalogueUrl ?? basicSellerCatalogueUrl ?? undefined,
          });

          await tx.productHistory.create({
            data: {
              productId: productRow.id,
              changeType,
              snapshot,
            },
          });
        }
      },
      {
        timeout: 60000, // 60 seconds timeout per batch
        maxWait: 10000, // 10 seconds max wait to start
      },
    );
  }

  // Handle deactivations and scan log in a separate transaction
  await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const toDeactivate = await tx.product.findMany({
        where: {
          sellerPhone,
          isActive: true,
          id: { notIn: Array.from(seenIds) },
        },
      });

      for (const product of toDeactivate) {
        const updated = await tx.product.update({
          where: { id: product.id },
          data: {
            isActive: false,
            lastModifiedAt: scanTime,
          },
        });

        const snapshot = buildSnapshot({
          productRow: updated,
          productUrl: null,
          sellerName: basicSellerName ?? undefined,
          sellerCity: basicSellerCity ?? undefined,
          sellerCatalogueUrl: basicSellerCatalogueUrl ?? undefined,
        });

        await tx.productHistory.create({
          data: {
            productId: updated.id,
            changeType: 'DEACTIVATED',
            snapshot,
          },
        });
      }

      await tx.scanLog.create({
        data: {
          sellerPhone,
          scanTime,
          productsFound,
          productsNew,
          productsUpdated,
        },
      });
    },
    {
      timeout: 30000, // 30 seconds timeout for deactivations and scan log
      maxWait: 10000,
    },
  );
}

async function main() {
  console.log('Starting Phase 3 processor...');
  const scanTime = new Date();

  const products = await loadEnrichedProducts();

  const grouped = new Map<string, EnrichedProduct[]>();
  for (const p of products) {
    if (!p.id || !p.sellerPhone) continue;
    if (!grouped.has(p.sellerPhone)) {
      grouped.set(p.sellerPhone, []);
    }
    grouped.get(p.sellerPhone)!.push(p);
  }

  console.log(
    `Loaded ${products.length} products from products.enriched.json for ${grouped.size} seller(s).`,
  );

  for (const [sellerPhone, items] of grouped.entries()) {
    const inferredName =
      items.find((p) => p.sellerName && p.sellerName.trim().length > 0)?.sellerName ?? undefined;
    const inferredCity =
      items.find((p) => p.sellerCity && p.sellerCity.trim().length > 0)?.sellerCity ?? undefined;
    const inferredCatalogueUrl =
      items.find((p) => p.sellerCatalogueUrl && p.sellerCatalogueUrl.trim().length > 0)?.sellerCatalogueUrl ?? undefined;
    console.log(`Processing seller ${sellerPhone} with ${items.length} products...`);
    await processSellerGroup(sellerPhone, items, scanTime, inferredName, inferredCity, inferredCatalogueUrl);
  }

  console.log('Phase 3 processing complete.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Processor failed:', err);
  process.exit(1);
});


