import { Bricolage_Grotesque, Figtree } from "next/font/google";

// Headings and prices: a grotesque with some character.
export const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

// Everything else: a clean, friendly sans that stays readable at small sizes.
export const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});
