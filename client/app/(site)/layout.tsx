import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

// Frame of the public pages: header on top, page below.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
