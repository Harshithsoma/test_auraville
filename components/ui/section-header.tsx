type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  body?: string;
};

export function SectionHeader({ eyebrow, title, body }: SectionHeaderProps) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="mb-3 text-xs font-bold uppercase text-[var(--coral)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
        {title}
      </h2>
      {body ? <p className="mt-4 text-base leading-7 text-[var(--muted)]">{body}</p> : null}
    </div>
  );
}
