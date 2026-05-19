export type HomepageCmsDisplayMode = "custom" | "default" | "hidden";

export type HomepageHeroSlide = {
  title?: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  buttonText?: string;
  objectPosition?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type HomepageAnnouncementItem = {
  text: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type HomepageDoYouKnowCard = {
  title: string;
  body: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  postedAt?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type HomepageFaqItem = {
  q: string;
  a: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type HomepageFeaturedCoreContent = {
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl: string;
  linkUrl: string;
  buttonText?: string;
  eyebrow?: string;
  secondaryText?: string;
};

export const HOMEPAGE_DEFAULT_HERO_SLIDES: HomepageHeroSlide[] = [
  {
    title: "Bringing palmyra sprout back to the snack shelf.",
    imageUrl: "/hero/palmyra-energy.svg",
    linkUrl: "/product/palmyra-sprout-energy-bar",
    objectPosition: "50% 50%",
    sortOrder: 0,
    isActive: true
  },
  {
    title: "Palmyra sprout cookies coming soon.",
    imageUrl: "/hero/palmyra-cookies.svg",
    linkUrl: "/product/palmyra-sprout-cookies",
    objectPosition: "50% 50%",
    sortOrder: 1,
    isActive: true
  },
  {
    title: "Palmyra health mix coming soon.",
    imageUrl: "/hero/palmyra-health-mix.svg",
    linkUrl: "/product/palmyra-sprout-health-mix",
    objectPosition: "50% 50%",
    sortOrder: 2,
    isActive: true
  },
  {
    title: "Palmyra sprout laddu coming soon.",
    imageUrl: "/hero/palmyra-laddu.svg",
    linkUrl: "/product/palmyra-sprout-laddu",
    objectPosition: "50% 50%",
    sortOrder: 3,
    isActive: true
  }
];

export const HOMEPAGE_DEFAULT_ANNOUNCEMENTS: HomepageAnnouncementItem[] = [
  { text: "Free shipping above Rs.499", sortOrder: 0, isActive: true },
  { text: "COD available in select cities", sortOrder: 1, isActive: true },
  { text: "Mon-Sat 8am to 8pm support", sortOrder: 2, isActive: true },
  { text: "Secure checkout", sortOrder: 3, isActive: true }
];

export const HOMEPAGE_DEFAULT_SCROLLING_BANNER_ITEMS: HomepageAnnouncementItem[] = [
  { text: "CLEAN EVERYDAY ENERGY", sortOrder: 0, isActive: true },
  { text: "MADE IN INDIA", sortOrder: 1, isActive: true },
  { text: "100% NATURAL", sortOrder: 2, isActive: true },
  { text: "NO PRESERVATIVES", sortOrder: 3, isActive: true },
  { text: "PALMYRA SPROUT FIRST", sortOrder: 4, isActive: true },
  { text: "GLUTEN FREE", sortOrder: 5, isActive: true },
  { text: "RICH IN FIBER", sortOrder: 6, isActive: true }
];

export const HOMEPAGE_DEFAULT_DO_YOU_KNOW_TITLE = "Do You Know?";
export const HOMEPAGE_DEFAULT_DO_YOU_KNOW_SUBTITLE = "";
export const HOMEPAGE_DEFAULT_DO_YOU_KNOW_CARDS: HomepageDoYouKnowCard[] = [
  {
    title: "Palmyra Sprout, Reintroduced",
    body: "Why this traditional ingredient deserves a modern daily place.",
    imageUrl: "/sections/dyk-1.svg",
    postedAt: "2 days ago",
    linkUrl:
      "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    buttonText: "View on Instagram",
    sortOrder: 0,
    isActive: true
  },
  {
    title: "Clean Ingredient Notes",
    body: "How we keep labels simple and meaningful for real families.",
    imageUrl: "/sections/dyk-2.svg",
    postedAt: "4 days ago",
    linkUrl:
      "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    buttonText: "View on Instagram",
    sortOrder: 1,
    isActive: true
  },
  {
    title: "Everyday Energy Thinking",
    body: "Built for office breaks, school boxes, and travel days.",
    imageUrl: "/sections/dyk-3.svg",
    postedAt: "6 days ago",
    linkUrl:
      "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    buttonText: "View on Instagram",
    sortOrder: 2,
    isActive: true
  },
  {
    title: "Taste and Simplicity",
    body: "Balanced sweetness with an Indian-rooted nutrition story.",
    imageUrl: "/sections/dyk-4.svg",
    postedAt: "1 week ago",
    linkUrl:
      "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    buttonText: "View on Instagram",
    sortOrder: 3,
    isActive: true
  },
  {
    title: "Palmyra-First Recipes",
    body: "From snacks to shelves, every format starts with purpose.",
    imageUrl: "/sections/dyk-1.svg",
    postedAt: "1 week ago",
    linkUrl:
      "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    buttonText: "View on Instagram",
    sortOrder: 4,
    isActive: true
  },
  {
    title: "Auraville Journal",
    body: "Small updates from our ingredient sourcing and recipe desk.",
    imageUrl: "/sections/dyk-2.svg",
    postedAt: "2 weeks ago",
    linkUrl:
      "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    buttonText: "View on Instagram",
    sortOrder: 5,
    isActive: true
  }
];

export const HOMEPAGE_DEFAULT_WHY_AURAVILLE = {
  eyebrow: "Why Auraville",
  title: "A thoughtful Indian food brand built around palmyra sprout.",
  body: "Most snacks optimize for shelf noise. Auraville is designed for everyday trust. We bring palmyra sprout back in recipes that feel familiar, taste balanced, and support modern routines without compromise.",
  imageUrl: "/sections/energy-core.svg",
  linkUrl: ""
};

export const HOMEPAGE_DEFAULT_USP_LABELS = [
  "Gluten Free",
  "No Preservatives",
  "Rich in Fiber",
  "Rich in Iron",
  "Natural Energy"
];

export const HOMEPAGE_DEFAULT_FAQ_ITEMS: HomepageFaqItem[] = [
  {
    q: "Are the products gluten free?",
    a: "Our core energy bar range is made without wheat ingredients. Always check each product label before purchase.",
    sortOrder: 0,
    isActive: true
  },
  {
    q: "Is the sweetness from refined sugar?",
    a: "No. We use ingredient-led sweetness from sources like dates and jaggery based on recipe requirements.",
    sortOrder: 1,
    isActive: true
  },
  {
    q: "Is cash on delivery available?",
    a: "COD is available in select locations. You can see eligibility at checkout.",
    sortOrder: 2,
    isActive: true
  },
  {
    q: "How long does delivery take?",
    a: "Most orders dispatch quickly and are usually delivered within 2-5 business days depending on city.",
    sortOrder: 3,
    isActive: true
  },
  {
    q: "Can I cancel or change my order?",
    a: "Yes, cancellation or changes are possible before dispatch. Reach support quickly with your order ID.",
    sortOrder: 4,
    isActive: true
  },
  {
    q: "How should I store energy bars?",
    a: "Store in a cool, dry place away from direct sunlight. Keep packs sealed after opening.",
    sortOrder: 5,
    isActive: true
  },
  {
    q: "Do you ship all over India?",
    a: "We cover most serviceable pin codes across India and continue to expand delivery coverage.",
    sortOrder: 6,
    isActive: true
  },
  {
    q: "When will coming-soon products launch?",
    a: "We release in batches. Use Notify Me on product cards and we will alert you when each product goes live.",
    sortOrder: 7,
    isActive: true
  }
];

export const HOMEPAGE_DEFAULT_FEATURED_CORE: HomepageFeaturedCoreContent = {
  imageUrl: "/sections/energy-core.svg",
  linkUrl: "/product/palmyra-sprout-energy-bar",
  buttonText: "Shop Now",
  title: "",
  subtitle: "",
  body: "",
  eyebrow: "",
  secondaryText: ""
};

export const HOMEPAGE_DEFAULT_FOOTER_BLURB =
  "Palmyra sprout snacks bringing a forgotten ingredient back to everyday shelves.";

export const HOMEPAGE_DEFAULT_REVIEWS = {
  title: "Reviews",
  subtitle: ""
};
