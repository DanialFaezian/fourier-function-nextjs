import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fourier Lab — Fourier Series Calculator",
  description: "Turn sampled data into a Fourier series and inspect every calculation step.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
