// How public pages (server components) get their data.
// With the demo switch on they use the sample data; otherwise they call the NestJS server.
import { connection } from "next/server";
import { API_URL } from "./api";
import { DEMO, sampleDetail, searchSample } from "./demo";
import type { ListingDetail, SearchResponse } from "./listings";

export type SearchResult =
  { ok: true; data: SearchResponse } | { ok: false; message: string };

export async function fetchSearch(
  query: URLSearchParams,
): Promise<SearchResult> {
  if (DEMO) {
    // The sample data depends on today's date, so it is built when the request arrives.
    await connection();
    return { ok: true, data: searchSample(query) };
  }

  try {
    const response = await fetch(`${API_URL}/listings?${query}`, {
      cache: "no-store",
    });
    if (response.ok)
      return { ok: true, data: (await response.json()) as SearchResponse };
    if (response.status === 400) {
      return {
        ok: false,
        message:
          "Some filters are not valid. Check the rent range and page number.",
      };
    }
    return {
      ok: false,
      message: "The server had a problem. Try again in a moment.",
    };
  } catch {
    return { ok: false, message: "Could not reach the server." };
  }
}

// null when the listing does not exist or is not public.
export async function fetchDetail(id: string): Promise<ListingDetail | null> {
  if (DEMO) {
    await connection();
    return sampleDetail(id);
  }

  const response = await fetch(`${API_URL}/listings/${id}`, {
    cache: "no-store",
  });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error("Could not load the listing");
  return (await response.json()) as ListingDetail;
}
