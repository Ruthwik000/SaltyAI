import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "SALTY — Marine Intelligence Platform",
  description:
    "Grounded marine and coastal intelligence layer. Unified oceanographic telemetry, PFZ advisories, satellite SST/chlorophyll layers, geofencing, and safety forecasting for coastal operators.",
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
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">
        {children}
      </body>
    </html>
  );
}
