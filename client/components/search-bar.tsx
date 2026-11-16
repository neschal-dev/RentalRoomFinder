import { Search } from "lucide-react";
import { MoreFilters } from "@/components/more-filters";
import { CITIES, PROPERTY_TYPES, capitalize } from "@/lib/listings";

// The search pill: Where | Type | Highest rent, a round search button, and a Filters button.
// It is a plain HTML form that opens /listings?city=...&maxPrice=...
// `values` are the filters already in the URL, so the bar shows what is being searched.
export function SearchBar({
  values = {},
}: {
  values?: Record<string, string>;
}) {
  // Filters that live in the pop-up, counted for the little number on the Filters button.
  const extra = [
    "area",
    "minPrice",
    "bedrooms",
    "furnishing",
    "parking",
    "petsAllowed",
  ].filter((k) => values[k]).length;

  const segment =
    "flex min-w-0 flex-1 flex-col justify-center px-5 py-2.5 text-left";
  const label = "text-xs font-semibold";
  const control =
    "w-full min-w-0 bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70 focus:text-foreground";

  return (
    <form
      method="GET"
      action="/listings"
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 flex-col divide-y divide-border rounded-3xl border border-border bg-card shadow-sm sm:flex-row sm:divide-x sm:divide-y-0 sm:rounded-full">
        <label className={segment}>
          <span className={label}>Where</span>
          <select
            name="city"
            defaultValue={values.city ?? ""}
            className={control}
          >
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className={segment}>
          <span className={label}>Type</span>
          <select
            name="propertyType"
            defaultValue={values.propertyType ?? ""}
            className={control}
          >
            <option value="">Room, flat or house</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {capitalize(t)}
              </option>
            ))}
          </select>
        </label>
        <label className={segment}>
          <span className={label}>Highest rent</span>
          <input
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={values.maxPrice ?? ""}
            placeholder="Any amount a month"
            className={control}
          />
        </label>
        <div className="flex items-center justify-end p-2 sm:pr-2">
          <button
            type="submit"
            aria-label="Search"
            className="flex size-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/85 sm:w-12"
          >
            <Search className="size-5" />
            <span className="font-semibold sm:hidden">Search</span>
          </button>
        </div>
      </div>

      <MoreFilters values={values} activeCount={extra} />
    </form>
  );
}
