import Link from "next/link";

export function LeashLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-stone-900 text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="7" cy="7" r="3" />
          <path d="M9.5 9.5 17 17" />
          <path d="M14 20h6v-6" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-stone-900">Leash</span>
        <span className="block text-[11px] text-stone-500">Your assistant, on a leash</span>
      </span>
    </Link>
  );
}
