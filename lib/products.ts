import type { Product, ProductCategory } from "@/types/product";

export const categories: ProductCategory[] = [
  "Energy Bars",
  "Cookies",
  "Health Mix",
  "Laddu",
  "Combos"
];

export const products: Product[] = [
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
    availability: "available",
    rating: 4.8,
    reviewCount: 126,
    isFeatured: true,
    isNew: true,
    badgeLabel: "Low Stock",
    popularity: 100,
    ingredients: ["Palmyra sprout", "Dates", "Peanuts", "Pumpkin seeds", "Jaggery", "Cardamom"],
    benefits: ["Made with palmyra sprout", "No refined sugar", "Travel friendly"],
    variants: [
      { id: "single", label: "40 g bar", price: 149, unit: "bar" },
      { id: "box-6", label: "Box of 6", price: 849, unit: "box" },
      { id: "box-12", label: "Box of 12", price: 1599, unit: "box" }
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
    availability: "coming-soon",
    releaseNote: "Coming soon",
    rating: 4.7,
    reviewCount: 0,
    isFeatured: true,
    isNew: true,
    badgeLabel: "Subscription Favorite",
    popularity: 92,
    ingredients: ["Palmyra sprout flour", "Millet", "Jaggery", "Roasted peanuts", "Cardamom"],
    benefits: ["Tea-time snack", "Heritage ingredient", "No artificial flavors"],
    variants: [
      { id: "150g", label: "150 g pack", price: 249, unit: "pack" },
      { id: "300g", label: "300 g pack", price: 449, unit: "pack" }
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
    availability: "coming-soon",
    releaseNote: "Coming soon",
    rating: 4.9,
    reviewCount: 0,
    isFeatured: true,
    isNew: false,
    badgeLabel: "Bestseller Pick",
    popularity: 88,
    ingredients: ["Palmyra sprout", "Sprouted ragi", "Green gram", "Almonds", "Cardamom"],
    benefits: ["Family breakfast", "Sprouted grains", "Warm or cold prep"],
    variants: [
      { id: "250g", label: "250 g pouch", price: 399, unit: "pouch" },
      { id: "500g", label: "500 g pouch", price: 749, unit: "pouch" }
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
    availability: "coming-soon",
    releaseNote: "Coming soon",
    rating: 4.8,
    reviewCount: 0,
    isFeatured: true,
    isNew: false,
    badgeLabel: "Bundle Deal",
    popularity: 86,
    ingredients: ["Palmyra sprout", "Sesame", "Peanut", "Coconut", "Jaggery"],
    benefits: ["Traditional format", "No refined sugar", "Festival-ready"],
    variants: [
      { id: "box-6", label: "Box of 6", price: 299, unit: "box" },
      { id: "box-12", label: "Box of 12", price: 549, unit: "box" }
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
    availability: "coming-soon",
    releaseNote: "Coming soon",
    rating: 4.6,
    reviewCount: 0,
    isFeatured: false,
    isNew: true,
    badgeLabel: "New Arrival",
    popularity: 76,
    ingredients: ["Palmyra sprout", "Banana", "Oats", "Peanut butter", "Jaggery"],
    benefits: ["Kid friendly", "Soft texture", "Tiffin ready"],
    variants: [
      { id: "box-8", label: "Box of 8", price: 349, unit: "box" },
      { id: "box-16", label: "Box of 16", price: 649, unit: "box" }
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
    availability: "coming-soon",
    releaseNote: "Coming soon",
    rating: 4.8,
    reviewCount: 0,
    isFeatured: false,
    isNew: true,
    badgeLabel: "Bundle Deal",
    popularity: 70,
    ingredients: ["Palmyra sprout", "Millets", "Dates", "Nuts", "Jaggery"],
    benefits: ["Giftable", "Full range trial", "Launch bundle"],
    variants: [{ id: "box", label: "Starter box", price: 999, unit: "box" }]
  }
];

export function getFeaturedProducts() {
  return products.filter((product) => product.isFeatured).slice(0, 4);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function getCompareAtUnitPrice(productId: string, unitPrice: number) {
  const product = getProductById(productId);
  if (!product?.compareAtPrice || product.compareAtPrice <= product.price) {
    return unitPrice;
  }
  return Math.max(unitPrice, Math.round((unitPrice * product.compareAtPrice) / product.price));
}

export function getRelatedProducts(product: Product) {
  return products
    .filter((candidate) => candidate.category === product.category && candidate.id !== product.id)
    .concat(products.filter((candidate) => candidate.category !== product.category))
    .slice(0, 4);
}

export function getPriceRange() {
  const prices = products.map((product) => product.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
}
