import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teamzone IUP",
  description: "Individual development plans for coaches and players.",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
