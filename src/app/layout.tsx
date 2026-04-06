import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teamzone IUP",
  description: "Individual development plans for coaches and players.",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{props.children}</body>
    </html>
  );
}
