import Link from "next/link";
import { CITIES } from "@/lib/listings";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold">Find a place to rent</h1>
      <p className="text-zinc-500">
        Rooms, flats and houses in {CITIES.join(", ")}.
      </p>
      <div className="flex gap-4">
        <Link
          href="/listings"
          className="flex h-11 items-center rounded-full bg-black px-8 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Browse places
        </Link>
        <Link
          href="/account/listings/new"
          className="flex h-11 items-center rounded-full border border-black/15 px-8 text-sm font-medium dark:border-white/20"
        >
          Post a place
        </Link>
      </div>
    </main>
  );
}
