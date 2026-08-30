import {
  deriveTrackingState,
  ORDER_TRACKING_STAGES,
  type CustomerOrder
} from "@/components/orders/order-data";

export function OrderTrackingProgress({ order }: { order: CustomerOrder }) {
  const tracking = deriveTrackingState(order);
  const currentIndex = Math.max(
    0,
    ORDER_TRACKING_STAGES.findIndex((stage) => stage.key === tracking.stage)
  );

  return (
    <section
      aria-labelledby="order-tracking-heading"
      className={`rounded-2xl border p-4 sm:p-5 ${
        tracking.isFailed ? "border-[#efb7b0] bg-[#fff7f7]" : "border-[var(--line)] bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            id="order-tracking-heading"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
          >
            Order tracking
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              tracking.isFailed
                ? "text-[var(--coral)]"
                : tracking.isStopped
                  ? "text-[var(--muted)]"
                  : "text-[var(--leaf-deep)]"
            }`}
          >
            {tracking.headline}
          </p>
        </div>
        {tracking.isStopped ? (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              tracking.isFailed
                ? "border-[#efb7b0] bg-white text-[var(--coral)]"
                : "border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {tracking.headline}
          </span>
        ) : null}
      </div>

      <ol
        aria-label="Order progress stages"
        className={`mt-5 grid grid-cols-5 ${
          tracking.isStopped ? "opacity-55 grayscale" : ""
        }`}
      >
        {ORDER_TRACKING_STAGES.map((stage, index) => {
          const isDone = !tracking.isStopped && index < currentIndex;
          const isCurrent = !tracking.isStopped && index === currentIndex;

          return (
            <li
              aria-current={isCurrent ? "step" : undefined}
              className="relative min-w-0 text-center"
              key={stage.key}
            >
              {index < ORDER_TRACKING_STAGES.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-3 h-px w-full ${
                    isDone ? "bg-[var(--leaf)]" : "bg-[#cfd8d2]"
                  }`}
                />
              ) : null}
              <span
                className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white text-[9px] font-bold ${
                  isDone
                    ? "border-[var(--leaf)] bg-[var(--leaf)] text-white"
                    : isCurrent
                      ? "border-[var(--coral)] text-[var(--coral)]"
                      : "border-[#cfd8d2] text-[var(--muted)]"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span className="mt-2 block px-0.5 text-[9px] font-medium leading-3 text-[var(--ink-soft)] sm:text-[11px] sm:leading-4">
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Tracking updates automatically from Auraville order status.
      </p>
    </section>
  );
}
