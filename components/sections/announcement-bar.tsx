import { HOMEPAGE_DEFAULT_ANNOUNCEMENTS } from "@/lib/homepage-defaults";

const defaultAnnouncements = [
  {
    text: "Free shipping above Rs.499",
    icon: <path d="M3 7h11v8H3V7Zm11 2h3l3 3v3h-6V9Zm-8 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
  },
  {
    text: "COD available in select cities",
    icon: <path d="M4 6h16v12H4zM8 10h8M8 14h5" />
  },
  {
    text: "Mon-Sat 8am to 8pm support",
    icon: <path d="M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
  },
  {
    text: "Secure checkout",
    icon: <path d="M12 3 4 7v5c0 5 3.4 9.6 8 10 4.6-.4 8-5 8-10V7l-8-4Zm-3 9 2 2 4-4" />
  }
];

export function AnnouncementBar({ items }: { items?: string[] }) {
  const fallbackMessages =
    HOMEPAGE_DEFAULT_ANNOUNCEMENTS.length > 0
      ? HOMEPAGE_DEFAULT_ANNOUNCEMENTS.map((entry) => entry.text)
      : defaultAnnouncements.map((entry) => entry.text);
  const messages = items && items.length > 0 ? items : fallbackMessages;
  const iconSource = defaultAnnouncements;
  const announcements = messages.map((text, index) => ({
    text,
    icon: iconSource[index % iconSource.length]?.icon ?? iconSource[0].icon
  }));

  return (
    <section className="bg-[var(--coral)] py-3 text-white" aria-label="Store announcements">
      <div className="container-page grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {announcements.map((item) => (
          <div className="flex min-h-10 items-center gap-2.5 rounded-lg px-1 py-1" key={item.text}>
            <svg aria-hidden="true" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none">
              <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                {item.icon}
              </g>
            </svg>
            <p className="text-[10px] font-semibold leading-4 sm:text-xs">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
