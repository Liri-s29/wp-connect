import { prisma } from './prisma';

export async function getSellers() {
  return await prisma.seller.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProducts() {
  return await prisma.product.findMany({
    include: {
      seller: {
        select: {
          phoneNumber: true,
          name: true,
          city: true,
          catalogueUrl: true,
        },
      },
    },
    orderBy: { lastSeenAt: 'desc' },
  });
}

export async function getProductHistory() {
  return await prisma.productHistory.findMany({
    include: {
      product: {
        select: {
          id: true,
          rawName: true,
          seller: {
            select: {
              phoneNumber: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { recordedAt: 'desc' },
  });
}

export async function getScanLogs() {
  return await prisma.scanLog.findMany({
    include: {
      seller: {
        select: {
          phoneNumber: true,
          name: true,
          city: true,
        },
      },
    },
    orderBy: { scanTime: 'desc' },
  });
}

type RawSellerMetric = {
  seller_phone: string;
  seller_name: string | null;
  city: string | null;
  catalogue_url: string | null;
  total_phones: bigint | number;
  current_active_inventory: bigint | number;
  active_avg_listings_week: any;
  phones_last_week: bigint | number;
  avg_listings_week: any;
  product_info_score: any;
  avg_image_count: any;
  is_valid: boolean;
  last_scan_date: Date | null;
};

export type SellerMetric = {
  seller_phone: string;
  seller_name: string | null;
  city: string | null;
  catalogue_url: string | null;
  total_phones: number;
  current_active_inventory: number;
  active_avg_listings_week: number;
  phones_last_week: number;
  avg_listings_week: number;
  product_info_score: number;
  avg_image_count: number;
  is_valid: boolean;
  last_scan_date: Date | null;
};

export async function getSellerMetrics(): Promise<SellerMetric[]> {
  const rawMetrics = await prisma.$queryRaw<RawSellerMetric[]>`
    SELECT * FROM seller_metrics_view
    ORDER BY is_valid DESC, product_info_score DESC, seller_phone
  `;

  return rawMetrics.map((metric) => ({
    seller_phone: metric.seller_phone,
    seller_name: metric.seller_name,
    city: metric.city,
    catalogue_url: metric.catalogue_url,
    total_phones: Number(metric.total_phones ?? 0),
    current_active_inventory: Number(metric.current_active_inventory ?? 0),
    active_avg_listings_week: Number(metric.active_avg_listings_week ?? 0),
    phones_last_week: Number(metric.phones_last_week ?? 0),
    avg_listings_week: Number(metric.avg_listings_week ?? 0),
    product_info_score: Number(metric.product_info_score ?? 0),
    avg_image_count: Number(metric.avg_image_count ?? 0),
    is_valid: metric.is_valid ?? false,
    last_scan_date: metric.last_scan_date,
  }));
}

