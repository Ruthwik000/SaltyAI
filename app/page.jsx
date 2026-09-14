import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { KnowMore } from "@/components/ui/know-more";

const features = [
  ["01", "Safe to go", "A clear answer for today, from live INCOIS sea state and warnings."],
  ["02", "Fishing zones", "Today's official advisories, with distance and bearing."],
  ["03", "Seven-day sea", "Waves, wind, rain and tides, hour by hour."],
  ["04", "Ask by voice", "An agent that answers in your language and names its source."],
  ["05", "Trip tracking", "Your track shared with the coastal operator until you are home."],
  ["06", "Search & rescue", "Drift prediction from live wind and current."],
];

export default function StartPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <Link
          href="/login"
          className="sw-press flex h-10 items-center gap-2 rounded-[2px] bg-[#0b0b0c] px-4 text-sm font-semibold text-white hover:bg-[#3a393e]"
        >
          Enter <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </SiteHeader>

      <main className="w-full flex-1">
        <section className="relative overflow-hidden border-b border-[#0b0b0c]">
          <Image
            src="/background.webp"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
          <div className="relative grid gap-8 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-10 lg:py-20">
          <div className="lg:col-span-12">
            <h1 className="sw-serif text-[clamp(3rem,9vw,8.5rem)] leading-[0.92] text-white">
              Know the sea
              <br />
              <span className="italic text-[#dcd9d1]">before you sail.</span>
            </h1>
            <div className="mt-10 grid gap-8 md:grid-cols-10">
              <p className="text-xl font-medium leading-snug tracking-[-0.015em] text-[#efede7] md:col-span-6">
                Marine intelligence for fishermen, researchers and coastal operators — built on
                live official data.
              </p>
              <div className="md:col-span-4 md:justify-self-end">
                <Link
                  href="/login"
                  className="sw-press inline-flex h-14 items-center gap-3 rounded-[2px] bg-[#f6f5f1] px-7 text-base font-semibold text-[#0b0b0c] hover:bg-white"
                >
                  Get started <ArrowUpRight className="h-5 w-5" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </div>
          </div>
        </section>

        <div className="px-4 sm:px-6 lg:px-10">
        <section className="grid border-b border-[#dcd9d1] md:grid-cols-2 xl:grid-cols-3">
          {features.map(([index, title, text]) => (
            <div key={index} className="flex min-h-56 flex-col justify-between border-b border-[#dcd9d1] py-8 md:border-r md:pr-8 md:[&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:pl-8 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(2n)]:pl-8 xl:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n+2)]:px-8 xl:[&:nth-child(3n+1)]:pl-0">
              <span className="sw-index">{index}</span>
              <div>
                <h2 className="sw-serif text-3xl text-[#0b0b0c]">{title}</h2>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#6d6c70]">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="grid py-10 lg:grid-cols-12">
          <div className="lg:col-span-2" />
          <KnowMore summary="Data sources" className="lg:col-span-10">
            <ul className="space-y-2 text-[15px]">
              <li>INCOIS — sea state, fishing zone advisories, high-wave and swell-surge warnings.</li>
              <li>Open-Meteo — tides and thunderstorm outlook.</li>
              <li>NOAA CoastWatch — satellite chlorophyll and sea temperature.</li>
            </ul>
          </KnowMore>
        </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
