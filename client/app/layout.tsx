import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { body, display } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindMeAPlace",
  description: "Find a place to rent in Kathmandu, Bhaktapur and Banepa",
};

// The frame around every page. The header and the dashboard sidebar are added by the
// layouts of each section: app/(site)/layout.tsx and app/account/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* ClerkProvider gives every page and component access to the logged-in user. */}
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
