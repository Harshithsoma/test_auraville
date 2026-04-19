"use client";

import { useState } from "react";

const faqItems = [
  {
    q: "Are the products gluten free?",
    a: "Our core energy bar range is made without wheat ingredients. Always check each product label before purchase."
  },
  {
    q: "Is the sweetness from refined sugar?",
    a: "No. We use ingredient-led sweetness from sources like dates and jaggery based on recipe requirements."
  },
  {
    q: "Is cash on delivery available?",
    a: "COD is available in select locations. You can see eligibility at checkout."
  },
  {
    q: "How long does delivery take?",
    a: "Most orders dispatch quickly and are usually delivered within 2-5 business days depending on city."
  },
  {
    q: "Can I cancel or change my order?",
    a: "Yes, cancellation or changes are possible before dispatch. Reach support quickly with your order ID."
  },
  {
    q: "How should I store energy bars?",
    a: "Store in a cool, dry place away from direct sunlight. Keep packs sealed after opening."
  },
  {
    q: "Do you ship all over India?",
    a: "We cover most serviceable pin codes across India and continue to expand delivery coverage."
  },
  {
    q: "When will coming-soon products launch?",
    a: "We release in batches. Use Notify Me on product cards and we will alert you when each product goes live."
  }
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-center text-3xl font-bold sm:text-4xl">
        FAQs
      </h2>
      <div className="mt-8 space-y-3">
        {faqItems.map((item, index) => {
          const isOpen = index === openIndex;
          return (
            <article className="overflow-hidden rounded-lg border border-[var(--line)] bg-white" key={item.q}>
              <button
                aria-expanded={isOpen}
                className="focus-ring flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                type="button"
                onClick={() => setOpenIndex((current) => (current === index ? -1 : index))}
              >
                <span className="text-sm font-semibold sm:text-base">{item.q}</span>
                <span className={`text-xl transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="border-t border-[var(--line)] px-4 py-4 text-sm leading-6 text-[var(--muted)] sm:px-5">
                    {item.a}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
