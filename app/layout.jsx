import { IBM_Plex_Serif, Inter_Tight } from "next/font/google";
import "./globals.css";

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "SALTY — Marine Intelligence Platform",
  description: "Sea conditions, fishing zones, warnings and search and rescue for India's coast.",
  keywords: [
    "marine intelligence",
    "oceanography",
    "coastal data",
    "potential fishing zones",
    "PFZ",
    "satellite SST",
    "chlorophyll-a",
    "geofencing",
    "maritime safety",
    "SALTY Marine",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${plexSerif.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
