import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-md">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-subtle"
      >
        <span className="grid grid-cols-2 gap-[3px]">
          <i className="block h-[5px] w-[5px] rounded-[1px] bg-accent" />
          <i className="block h-[5px] w-[5px] rounded-[1px] bg-accent/35" />
          <i className="block h-[5px] w-[5px] rounded-[1px] bg-accent/35" />
          <i className="block h-[5px] w-[5px] rounded-[1px] bg-accent" />
        </span>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Dock</span>
    </Link>
  );
}
