import { Button } from "@/components/ui/button";

export function ShopCta() {
  return (
    <section className="container-page py-12">
      <div className="grid gap-6 rounded-lg bg-[var(--leaf-deep)] p-8 text-white md:grid-cols-[1.1fr_0.9fr] md:p-12">
        <div>
          <p className="text-sm font-bold uppercase text-[#ffd9de]">Auraville USP</p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            One hero ingredient. Familiar snack formats.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#dfeee5]">
            We are not building a random health shelf. Every product starts with palmyra sprout and turns it into formats people already understand.
          </p>
          <Button className="mt-8 bg-white text-[var(--leaf-deep)] hover:bg-[var(--mint)]" href="/product/palmyra-sprout-energy-bar">
            Buy energy bar
          </Button>
        </div>
        <dl className="grid gap-4 sm:grid-cols-3 md:grid-cols-1">
          {[
            ["Heritage", "Bringing a lost ingredient back into use."],
            ["Convenience", "Energy bars now; cookies, mix, and laddu next."],
            ["Trust", "Clear launch status and clean ingredient-first recipes."]
          ].map(([title, body]) => (
            <div className="rounded-lg border border-white/20 bg-white/10 p-4" key={title}>
              <dt className="font-semibold">{title}</dt>
              <dd className="mt-2 text-sm leading-6 text-[#dfeee5]">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
