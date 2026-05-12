import { CouponType, PrismaClient, ProductAvailability, Role } from "@prisma/client";

const prisma = new PrismaClient();

type SeedVariant = {
  frontendVariantId: string;
  label: string;
  price: number;
  unit: string;
  stock: number;
};

type SeedProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice?: number;
  promoLabel?: string;
  currency: "INR";
  image: string;
  gallery: string[];
  category: "Energy Bars" | "Cookies" | "Health Mix" | "Laddu" | "Combos";
  availability: ProductAvailability;
  releaseNote?: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isNew: boolean;
  badgeLabel?: string;
  popularity: number;
  ingredients: string[];
  benefits: string[];
  isBestSeller: boolean;
  variants: SeedVariant[];
};

const categories = [
  { name: "Energy Bars", slug: "energy-bars" },
  { name: "Cookies", slug: "cookies" },
  { name: "Health Mix", slug: "health-mix" },
  { name: "Laddu", slug: "laddu" },
  { name: "Combos", slug: "combos" }
] as const;

const products: SeedProduct[] = [
  {
    id: "aur-palmyra-sprout-energy-bar",
    slug: "palmyra-sprout-energy-bar",
    name: "Palmyra Sprout Energy Bar",
    tagline: "A heritage snack revived for modern energy.",
    description:
      "A chewy energy bar made with palmyra sprout, dates, peanuts, seeds, and jaggery for steady everyday fuel.",
    longDescription:
      "Our first launch brings palmyra sprout back into the daily snack shelf. This bar is built for school bags, office drawers, workouts, and travel: familiar Indian ingredients, clean sweetness, and a texture that feels satisfying without being heavy.",
    price: 149,
    compareAtPrice: 166,
    currency: "INR",
    image:
      "https://images.unsplash.com/photo-1632370161597-9c8429934d1b?auto=format&fit=crop&w=1200&q=82",
    gallery: [
      "https://images.unsplash.com/photo-1632370161597-9c8429934d1b?auto=format&fit=crop&w=1200&q=82",
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=82"
    ],
    category: "Energy Bars",
    availability: ProductAvailability.available,
    rating: 4.8,
    reviewCount: 126,
    isFeatured: true,
    isNew: true,
    badgeLabel: "Low Stock",
    popularity: 100,
    ingredients: ["Palmyra sprout", "Dates", "Peanuts", "Pumpkin seeds", "Jaggery", "Cardamom"],
    benefits: ["Made with palmyra sprout", "No refined sugar", "Travel friendly"],
    isBestSeller: true,
    variants: [
      { frontendVariantId: "single", label: "40 g bar", price: 149, unit: "bar", stock: 150 },
      { frontendVariantId: "box-6", label: "Box of 6", price: 849, unit: "box", stock: 80 },
      { frontendVariantId: "box-12", label: "Box of 12", price: 1599, unit: "box", stock: 40 }
    ]
  },
  {
    id: "aur-palmyra-sprout-cookies",
    slug: "palmyra-sprout-cookies",
    name: "Palmyra Sprout Cookies",
    tagline: "Light, crisp cookies with a quietly earthy finish.",
    description:
      "Small-batch cookies planned with palmyra sprout flour, millet, jaggery, and roasted nuts.",
    longDescription:
      "These cookies are being developed as a better tea-time snack: crisp edges, gentle sweetness, and the familiar comfort of a biscuit with the added story of palmyra sprout.",
    price: 249,
    compareAtPrice: 276,
    currency: "INR",
    image:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=82",
    gallery: [
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=82",
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1200&q=82"
    ],
    category: "Cookies",
    availability: ProductAvailability.coming_soon,
    releaseNote: "Coming soon",
    rating: 4.7,
    reviewCount: 0,
    isFeatured: true,
    isNew: true,
    badgeLabel: "Subscription Favorite",
    popularity: 92,
    ingredients: ["Palmyra sprout flour", "Millet", "Jaggery", "Roasted peanuts", "Cardamom"],
    benefits: ["Tea-time snack", "Heritage ingredient", "No artificial flavors"],
    isBestSeller: true,
    variants: [
      { frontendVariantId: "150g", label: "150 g pack", price: 249, unit: "pack", stock: 0 },
      { frontendVariantId: "300g", label: "300 g pack", price: 449, unit: "pack", stock: 0 }
    ]
  },
  {
    id: "aur-palmyra-health-mix",
    slug: "palmyra-sprout-health-mix",
    name: "Palmyra Sprout Health Mix",
    tagline: "A nourishing mix for porridge, malt, and morning bowls.",
    description:
      "A planned breakfast mix with palmyra sprout, sprouted grains, pulses, nuts, and aromatic spice.",
    longDescription:
      "The health mix is designed for families who want one reliable breakfast base. Stir it into warm milk or water for porridge, or blend it into smoothies when mornings are moving fast.",
    price: 399,
    compareAtPrice: 443,
    currency: "INR",
    image:
      "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=1200&q=82",
    gallery: [
      "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=1200&q=82",
      "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=1200&q=82"
    ],
    category: "Health Mix",
    availability: ProductAvailability.coming_soon,
    releaseNote: "Coming soon",
    rating: 4.9,
    reviewCount: 0,
    isFeatured: true,
    isNew: false,
    badgeLabel: "Bestseller Pick",
    popularity: 88,
    ingredients: ["Palmyra sprout", "Sprouted ragi", "Green gram", "Almonds", "Cardamom"],
    benefits: ["Family breakfast", "Sprouted grains", "Warm or cold prep"],
    isBestSeller: true,
    variants: [
      { frontendVariantId: "250g", label: "250 g pouch", price: 399, unit: "pouch", stock: 0 },
      { frontendVariantId: "500g", label: "500 g pouch", price: 749, unit: "pouch", stock: 0 }
    ]
  },
  {
    id: "aur-palmyra-sprout-laddu",
    slug: "palmyra-sprout-laddu",
    name: "Palmyra Sprout Laddu",
    tagline: "A festive bite shaped for everyday snacking.",
    description:
      "A coming-soon laddu made with palmyra sprout, sesame, peanut, coconut, and jaggery.",
    longDescription:
      "Palmyra Sprout Laddu takes the comfort of a traditional sweet and turns it into a cleaner daily snack. The recipe is being balanced for richness, texture, and a gentle sweetness that does not overpower the main ingredient.",
    price: 299,
    compareAtPrice: 332,
    currency: "INR",
    image:
      "https://images.unsplash.com/photo-1769576918185-f4f57316d78a?auto=format&fit=crop&w=1200&q=82",
    gallery: [
      "https://images.unsplash.com/photo-1769576918185-f4f57316d78a?auto=format&fit=crop&w=1200&q=82",
      "https://images.unsplash.com/photo-1769576918185-f4f57316d78a?auto=format&fit=crop&w=1200&q=82"
    ],
    category: "Laddu",
    availability: ProductAvailability.coming_soon,
    releaseNote: "Coming soon",
    rating: 4.8,
    reviewCount: 0,
    isFeatured: true,
    isNew: false,
    badgeLabel: "Bundle Deal",
    popularity: 86,
    ingredients: ["Palmyra sprout", "Sesame", "Peanut", "Coconut", "Jaggery"],
    benefits: ["Traditional format", "No refined sugar", "Festival-ready"],
    isBestSeller: true,
    variants: [
      { frontendVariantId: "box-6", label: "Box of 6", price: 299, unit: "box", stock: 0 },
      { frontendVariantId: "box-12", label: "Box of 12", price: 549, unit: "box", stock: 0 }
    ]
  },
  {
    id: "aur-palmyra-breakfast-bites",
    slug: "palmyra-breakfast-bites",
    name: "Palmyra Breakfast Bites",
    tagline: "Soft bite-sized snacks for kids and grown-up desks.",
    description:
      "A planned snack format with palmyra sprout, banana, oats, and roasted nut butter.",
    longDescription:
      "Breakfast Bites are being built as a soft, quick snack for school tiffins, commutes, and mid-morning breaks. The goal is simple: heritage nutrition in a familiar bite-sized shape.",
    price: 349,
    compareAtPrice: 388,
    currency: "INR",
    image:
      "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&w=1200&q=82",
    gallery: [
      "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&w=1200&q=82",
      "https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=82"
    ],
    category: "Energy Bars",
    availability: ProductAvailability.coming_soon,
    releaseNote: "Coming soon",
    rating: 4.6,
    reviewCount: 0,
    isFeatured: false,
    isNew: true,
    badgeLabel: "New Arrival",
    popularity: 76,
    ingredients: ["Palmyra sprout", "Banana", "Oats", "Peanut butter", "Jaggery"],
    benefits: ["Kid friendly", "Soft texture", "Tiffin ready"],
    isBestSeller: true,
    variants: [
      { frontendVariantId: "box-8", label: "Box of 8", price: 349, unit: "box", stock: 0 },
      { frontendVariantId: "box-16", label: "Box of 16", price: 649, unit: "box", stock: 0 }
    ]
  },
  {
    id: "aur-palmyra-starter-box",
    slug: "palmyra-starter-box",
    name: "Palmyra Starter Box",
    tagline: "A tasting box for the first full Auraville shelf.",
    description:
      "A future discovery box with the energy bar, cookies, health mix, and laddu in one pack.",
    longDescription:
      "The starter box will make the full Auraville range easy to try or gift. It is planned as a compact introduction to palmyra sprout across snacks, breakfast, and sweets.",
    price: 999,
    compareAtPrice: 1110,
    currency: "INR",
    image:
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=82",
    gallery: [
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=82",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=82"
    ],
    category: "Combos",
    availability: ProductAvailability.coming_soon,
    releaseNote: "Coming soon",
    rating: 4.8,
    reviewCount: 0,
    isFeatured: false,
    isNew: true,
    badgeLabel: "Bundle Deal",
    popularity: 70,
    ingredients: ["Palmyra sprout", "Millets", "Dates", "Nuts", "Jaggery"],
    benefits: ["Giftable", "Full range trial", "Launch bundle"],
    isBestSeller: true,
    variants: [{ frontendVariantId: "box", label: "Starter box", price: 999, unit: "box", stock: 0 }]
  }
];

async function seedCategories() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: { name: category.name, slug: category.slug }
    });
  }

  return prisma.category.findMany();
}

async function seedProducts(categoryRecords: Array<{ id: string; name: string }>) {
  const categoryIdByName = new Map(categoryRecords.map((item) => [item.name, item.id]));

  for (const product of products) {
    const categoryId = categoryIdByName.get(product.category);

    if (!categoryId) {
      throw new Error(`Missing category for product ${product.id}`);
    }

    const createData = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      longDescription: product.longDescription,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      promoLabel: product.promoLabel,
      currency: product.currency,
      image: product.image,
      categoryId,
      availability: product.availability,
      releaseNote: product.releaseNote,
      rating: product.rating,
      reviewCount: product.reviewCount,
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      isNew: product.isNew,
      badgeLabel: product.badgeLabel,
      popularity: product.popularity,
      ingredients: product.ingredients,
      benefits: product.benefits,
      isActive: true,
      variants: {
        create: product.variants.map((variant) => ({
          frontendVariantId: variant.frontendVariantId,
          label: variant.label,
          price: variant.price,
          unit: variant.unit,
          stock: variant.stock,
          isActive: true
        }))
      },
      images: {
        create: product.gallery.map((url, position) => ({
          url,
          alt: `${product.name} image ${position + 1}`,
          position
        }))
      }
    };

    await prisma.product.upsert({
      where: { id: product.id },
      create: createData,
      update: {
        slug: createData.slug,
        name: createData.name,
        tagline: createData.tagline,
        description: createData.description,
        longDescription: createData.longDescription,
        price: createData.price,
        compareAtPrice: createData.compareAtPrice,
        promoLabel: createData.promoLabel,
        currency: createData.currency,
        image: createData.image,
        categoryId: createData.categoryId,
        availability: createData.availability,
        releaseNote: createData.releaseNote,
        rating: createData.rating,
        reviewCount: createData.reviewCount,
        isFeatured: createData.isFeatured,
        isBestSeller: createData.isBestSeller,
        isNew: createData.isNew,
        badgeLabel: createData.badgeLabel,
        popularity: createData.popularity,
        ingredients: createData.ingredients,
        benefits: createData.benefits,
        isActive: createData.isActive,
        variants: {
          deleteMany: {},
          create: createData.variants.create
        },
        images: {
          deleteMany: {},
          create: createData.images.create
        }
      }
    });
  }
}

async function seedCoupons() {
  await prisma.coupon.upsert({
    where: { code: "AURA10" },
    update: {
      type: CouponType.PERCENT,
      discountValue: 10,
      isActive: true,
      minOrderValue: null,
      maxDiscount: null,
      usageLimit: null,
      usageLimitPerUser: null,
      startsAt: null,
      expiresAt: null
    },
    create: {
      code: "AURA10",
      type: CouponType.PERCENT,
      discountValue: 10,
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "PALMYRA15" },
    update: {
      type: CouponType.PERCENT,
      discountValue: 15,
      isActive: true,
      minOrderValue: null,
      maxDiscount: null,
      usageLimit: null,
      usageLimitPerUser: null,
      startsAt: null,
      expiresAt: null
    },
    create: {
      code: "PALMYRA15",
      type: CouponType.PERCENT,
      discountValue: 15,
      isActive: true
    }
  });
}

async function seedHomepageSections() {
  const sectionKeys = [
    "hero",
    "announcement",
    "do_you_know",
    "why_auraville",
    "usp_features",
    "faq",
    "reviews",
    "footer"
  ];

  for (const [index, key] of sectionKeys.entries()) {
    await prisma.homepageSection.upsert({
      where: { key },
      update: { isActive: true, position: index },
      create: { key, isActive: true, position: index }
    });
  }
}

async function seedAdminUser() {
  await prisma.user.upsert({
    where: { email: "admin@auraville.in" },
    update: { role: Role.ADMIN },
    create: {
      email: "admin@auraville.in",
      name: "Auraville Admin",
      role: Role.ADMIN
    }
  });
}

async function main() {
  const categoryRecords = await seedCategories();
  await seedProducts(categoryRecords);
  await seedCoupons();
  await seedHomepageSections();
  await seedAdminUser();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Prisma seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
