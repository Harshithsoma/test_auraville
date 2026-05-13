import "dotenv/config";
import { PrismaClient } from "@prisma/client";

type AuditTarget = {
  model: string;
  recordId: string;
  label?: string;
  field: string;
  url: string;
};

type BrokenResult = AuditTarget & {
  status: number | null;
  methodTried: "HEAD" | "GET" | "HEAD+GET";
  error?: string;
  recommendedAction: string;
};

const prisma = new PrismaClient();
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_CONCURRENCY = 8;

function isLikelyUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isCloudinaryUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

function likelyImageByPath(path: string): boolean {
  return /(image|img|photo|thumbnail|thumb|banner|hero|logo|gallery|icon|asset)/i.test(path);
}

function likelyImageByUrl(value: string): boolean {
  const lower = value.toLowerCase();

  if (/(\.png|\.jpe?g|\.webp|\.avif|\.gif|\.svg|\.bmp|\.tiff)(\?|$)/.test(lower)) {
    return true;
  }

  if (lower.includes("res.cloudinary.com") && lower.includes("/image/")) {
    return true;
  }

  return false;
}

function extractImageUrlsFromJson(
  input: unknown,
  path = "metadata",
  out: Array<{ path: string; url: string }> = []
): Array<{ path: string; url: string }> {
  if (typeof input === "string") {
    if (isLikelyUrl(input) && (likelyImageByPath(path) || likelyImageByUrl(input))) {
      out.push({ path, url: input });
    }
    return out;
  }

  if (Array.isArray(input)) {
    input.forEach((item, index) => {
      extractImageUrlsFromJson(item, `${path}[${index}]`, out);
    });
    return out;
  }

  if (input && typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      extractImageUrlsFromJson(value, `${path}.${key}`, out);
    }
  }

  return out;
}

function recommendedActionFor(status: number | null, error?: string): string {
  if (status === 404) {
    return "Re-upload image and update DB field to a valid URL.";
  }

  if (status === 401 || status === 403) {
    return "Check asset access permissions or signed/private delivery settings.";
  }

  if (status !== null && status >= 500) {
    return "Remote provider/server error. Retry later and monitor provider availability.";
  }

  if (error) {
    return "Check URL format, DNS/network reachability, and whether asset still exists.";
  }

  return "Verify URL manually and replace if invalid.";
}

async function fetchWithTimeout(url: string, method: "HEAD" | "GET"): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers:
        method === "GET"
          ? {
              Range: "bytes=0-0"
            }
          : undefined
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkImageUrl(target: AuditTarget): Promise<BrokenResult | null> {
  const runHead = async (): Promise<{ ok: boolean; status: number | null; error?: string }> => {
    try {
      const headResponse = await fetchWithTimeout(target.url, "HEAD");
      return { ok: headResponse.ok, status: headResponse.status };
    } catch (error) {
      return {
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : "HEAD request failed"
      };
    }
  };

  const runGet = async (): Promise<{ ok: boolean; status: number | null; error?: string }> => {
    try {
      const getResponse = await fetchWithTimeout(target.url, "GET");
      return { ok: getResponse.ok, status: getResponse.status };
    } catch (error) {
      return {
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : "GET request failed"
      };
    }
  };

  const head = await runHead();
  if (head.ok) {
    return null;
  }

  const shouldFallbackToGet = isCloudinaryUrl(target.url) || head.status === 405 || head.status === null;

  if (!shouldFallbackToGet) {
    return {
      ...target,
      status: head.status,
      methodTried: "HEAD",
      error: head.error,
      recommendedAction: recommendedActionFor(head.status, head.error)
    };
  }

  const get = await runGet();
  if (get.ok) {
    return null;
  }

  return {
    ...target,
    status: get.status ?? head.status,
    methodTried: "HEAD+GET",
    error: get.error ?? head.error,
    recommendedAction: recommendedActionFor(get.status ?? head.status, get.error ?? head.error)
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function collectTargets(): Promise<AuditTarget[]> {
  const targets: AuditTarget[] = [];

  const [products, productImages, homepageSections, orderItems] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        image: true
      }
    }),
    prisma.productImage.findMany({
      select: {
        id: true,
        url: true,
        product: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    }),
    prisma.homepageSection.findMany({
      select: {
        id: true,
        key: true,
        title: true,
        imageUrl: true,
        metadata: true
      }
    }),
    prisma.orderItem.findMany({
      select: {
        id: true,
        orderId: true,
        name: true,
        slug: true,
        image: true
      }
    })
  ]);

  for (const product of products) {
    if (product.image && isLikelyUrl(product.image)) {
      targets.push({
        model: "Product",
        recordId: product.id,
        label: `${product.name} (${product.slug})`,
        field: "image",
        url: product.image
      });
    }
  }

  for (const image of productImages) {
    if (image.url && isLikelyUrl(image.url)) {
      targets.push({
        model: "ProductImage",
        recordId: image.id,
        label: image.product ? `${image.product.name} (${image.product.slug})` : undefined,
        field: "url",
        url: image.url
      });
    }
  }

  for (const item of orderItems) {
    if (item.image && isLikelyUrl(item.image)) {
      targets.push({
        model: "OrderItem",
        recordId: item.id,
        label: `${item.name} (${item.slug})`,
        field: "image",
        url: item.image
      });
    }
  }

  for (const section of homepageSections) {
    if (section.imageUrl && isLikelyUrl(section.imageUrl)) {
      targets.push({
        model: "HomepageSection",
        recordId: section.id,
        label: section.title ?? section.key,
        field: "imageUrl",
        url: section.imageUrl
      });
    }

    if (section.metadata) {
      const extracted = extractImageUrlsFromJson(section.metadata, "metadata");
      for (const entry of extracted) {
        targets.push({
          model: "HomepageSection",
          recordId: section.id,
          label: section.title ?? section.key,
          field: entry.path,
          url: entry.url
        });
      }
    }
  }

  const unique = new Map<string, AuditTarget>();
  for (const target of targets) {
    const key = `${target.model}::${target.recordId}::${target.field}::${target.url}`;
    if (!unique.has(key)) {
      unique.set(key, target);
    }
  }

  return Array.from(unique.values());
}

async function main() {
  console.log("[audit:images] Starting local broken image audit...");

  const targets = await collectTargets();
  console.log(`[audit:images] URLs discovered: ${targets.length}`);

  const checked = await runWithConcurrency(targets, MAX_CONCURRENCY, checkImageUrl);
  const broken = checked.filter((item): item is BrokenResult => item !== null);

  console.log(`[audit:images] Broken URLs found: ${broken.length}`);

  if (broken.length === 0) {
    console.log("[audit:images] No broken image URLs detected.");
    return;
  }

  const rows = broken.map((item) => ({
    model: item.model,
    recordId: item.recordId,
    label: item.label ?? "-",
    field: item.field,
    status: item.status ?? "NETWORK_ERROR",
    method: item.methodTried,
    url: item.url,
    recommendedAction: item.recommendedAction
  }));

  console.table(rows);

  console.log("\nDetailed broken image report:\n");
  for (const issue of broken) {
    console.log(`- model/table: ${issue.model}`);
    console.log(`  record id: ${issue.recordId}`);
    console.log(`  name/title: ${issue.label ?? "-"}`);
    console.log(`  field: ${issue.field}`);
    console.log(`  broken URL: ${issue.url}`);
    console.log(`  HTTP status: ${issue.status ?? "NETWORK_ERROR"}`);
    if (issue.error) {
      console.log(`  error: ${issue.error}`);
    }
    console.log(`  recommended action: ${issue.recommendedAction}`);
    console.log("");
  }
}

main()
  .catch((error) => {
    console.error("[audit:images] Audit failed", {
      message: error instanceof Error ? error.message : "Unknown error"
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
