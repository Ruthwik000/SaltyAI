"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Ship, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import StackingCards, { StackingCardItem } from "@/components/ui/stacking-cards";

const features = [
  {
    title: "Verified Data Fusion",
    description: "Live tracking from INCOIS, NOAA, and Open-Meteo. Zero hallucinated data—if a source drops, we tell you. Absolute truth for life-safety decisions.",
    bgColor: "bg-[#f97316]",
    image: "/1.png"
  },
  {
    title: "Native Voice Interaction",
    description: "Hands-free, in-browser voice agent. Delivers updates in native Telugu or Tamil, gracefully falling back to romanised speech on budget devices. Always heard, never silent.",
    bgColor: "bg-[#0015ff]",
    image: "/2.png"
  },
  {
    title: "Dual-Mode Intelligence",
    description: "One agent, tailored literacy. Normal mode gives plain-language safety advice. Research mode delivers exact technical marine metrics. Perfect adaptation for every user.",
    bgColor: "bg-[#ff5941]",
    image: "/3.png"
  },
  {
    title: "Route-Level Safety",
    description: "Beyond point estimates. We score your entire sea track leg-by-leg, proactively flag extreme conditions, and actively monitor proximity to the Indian EEZ boundary.",
    bgColor: "bg-[#1f464d]",
    image: "/4.png"
  },
  {
    title: "Always Available Offline",
    description: "Built for the harsh realities of the open ocean. Core capabilities and critical life-safety intelligence remain fully accessible even when connectivity completely drops.",
    bgColor: "bg-[#0015ff]",
    image: "/5.png"
  }
];

export default function LandingPage() {
  const [apiState, setApiState] = React.useState("checking");
  const [isRoleModalOpen, setIsRoleModalOpen] = React.useState(false);

  // Health check
  React.useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010"}/api/health`,
      { cache: "no-store" }
    )
      .then((response) => {
        if (!response.ok) throw new Error("offline");
        setApiState("ready");
      })
      .catch(() => setApiState("demo"));
  }, []);

  return (
    <div className="relative w-full font-sans selection:bg-white selection:text-zinc-900 flex flex-col bg-zinc-950">
      
      {/* 
        ========================================
        HERO SECTION (DARK THEME)
        ========================================
      */}
      <div className="relative min-h-[90vh] w-full flex flex-col bg-black text-zinc-50 shrink-0">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/bg.png"
            alt="Oil Poster Background"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-6 py-6 gap-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 text-2xl font-medium tracking-widest text-white uppercase" style={{ fontFamily: "var(--font-playfair), serif" }}>
            <Ship className="h-7 w-7" strokeWidth={1.5} />
            <span>Salty AI</span>
          </div>
          <div className="flex items-center gap-8 text-xs uppercase tracking-[0.2em] font-medium">
            <div className="hidden sm:flex items-center gap-2 text-zinc-300">
              <Activity className="h-4 w-4" />
              <span>SYS: {apiState}</span>
            </div>
            <button 
              onClick={() => setIsRoleModalOpen(true)}
              className="border border-white/30 bg-white/5 backdrop-blur-md px-8 py-3 hover:bg-white hover:text-black transition-all duration-300 text-white shadow-lg shrink-0 uppercase tracking-widest text-xs"
            >
              Enter Workspace
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24 max-w-[1400px] mx-auto w-full py-12">
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full lg:w-3/4 flex flex-col justify-center"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-medium leading-[1.05] tracking-tight text-white drop-shadow-lg" style={{ fontFamily: "var(--font-playfair), serif" }}>
              The ocean is the signal.<br />
              <span className="italic text-zinc-300 font-light">Make it legible.</span>
            </h1>
            <p className="mt-6 sm:mt-8 max-w-xl text-lg sm:text-xl text-zinc-200 font-light leading-relaxed tracking-wide drop-shadow-md">
              Bringing satellite, oceanographic, forecast, warning, historical, and boundary data into one grounded workspace for professionals on the coast.
            </p>
          </motion.div>
        </main>
      </div>

      {/* 
        ========================================
        FEATURES SECTION (DARK GREY THEME)
        ========================================
      */}
      <section className="w-full bg-zinc-950 text-white flex flex-col items-center">
        <div className="w-full">
          <StackingCards totalCards={features.length}>
            <div className="relative min-h-[40vh] flex flex-col justify-center items-center px-6 py-20 text-center w-full z-10">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Unprecedented Marine Intelligence
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-zinc-400 font-light max-w-3xl leading-relaxed mb-12">
                Five differentiated capabilities built for the unpredictable realities of the open ocean. Real-time fusion, route-level scoring, and inclusive native voice technology—accessible to everyone.
              </p>
              <div className="text-sm font-bold uppercase tracking-[0.3em] text-[#ff5941] flex flex-col items-center gap-3">
                <span>Explore Features</span>
                <span className="animate-bounce text-xl">↓</span>
              </div>
            </div>
            
            {features.map(({ bgColor, description, image, title }, index) => {
              return (
                <StackingCardItem key={index} index={index} className="h-screen">
                  <div className="w-full h-full flex items-center justify-center">
                  <div
                    className={cn(
                      bgColor,
                      "w-[90%] max-w-[1000px] max-h-[85vh] flex-col sm:flex-row items-center px-8 sm:px-12 py-8 sm:py-10 flex rounded-[2rem] mx-auto relative shadow-2xl text-white border border-white/5"
                    )}
                  >
                    <div className="flex-1 flex flex-col justify-center sm:pr-10 relative z-10 w-full">
                      <h3 className="font-bold text-3xl sm:text-4xl mb-4 font-sans">
                        {title}
                      </h3>
                      <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-md font-sans">
                        {description}
                      </p>
                    </div>

                    <div className="w-full sm:w-[45%] relative mt-8 sm:mt-0 flex-shrink-0 flex justify-center items-center">
                      <img
                        src={image}
                        alt={title}
                        className="max-w-full max-h-[50vh] sm:max-h-[65vh] w-auto h-auto rounded-[1.25rem] shadow-xl"
                      />
                    </div>
                  </div>
                  </div>
                </StackingCardItem>
              );
            })}

            <div className="w-full h-40 relative overflow-hidden flex justify-center items-end pb-8">
              <h2 className="text-white/10 font-bold uppercase tracking-[0.5em] text-sm" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Salty Marine
              </h2>
            </div>
          </StackingCards>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-xs tracking-[0.2em] text-zinc-500 uppercase gap-4 bg-zinc-950 shrink-0">
        <div>© {new Date().getFullYear()} Salty Marine Intelligence</div>
        <div className="flex items-center gap-6">
          <span>Professional Coastal Data</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 bg-zinc-700 rounded-full" />
          <span className="hidden sm:inline-block">Est. 2026</span>
        </div>
      </footer>

      {/* Role Selection Modal */}
      <AnimatePresence>
        {isRoleModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
            onClick={() => setIsRoleModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f0f11] border border-white/10 rounded-3xl p-8 sm:p-12 max-w-4xl w-full shadow-2xl relative overflow-hidden"
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#f97316] opacity-10 rounded-full blur-3xl pointer-events-none" />
              
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              <h2 className="text-3xl sm:text-4xl font-medium text-white mb-2" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Select your workspace
              </h2>
              <p className="text-zinc-400 font-light mb-10 text-lg">
                Choose a role to configure your initial dashboard.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Fisherman */}
                <Link href="/app/fishing-zones" className="group relative flex flex-col items-start p-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="p-4 rounded-full bg-[#0015ff]/20 text-[#0015ff] mb-6 group-hover:scale-110 transition-transform">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13.5v.5c0 3-4 5.5-10 5.5S2 17 2 14v-.5"></path><path d="M22 10.5v.5c0 3-4 5.5-10 5.5S2 14 2 11v-.5"></path><path d="M22 7.5v.5c0 3-4 5.5-10 5.5S2 11 2 8v-.5"></path><path d="M12 2v20"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Fisherman</h3>
                  <p className="text-sm text-zinc-400 font-light">Optimize routes, locate potential fishing zones, and monitor sea state.</p>
                </Link>

                {/* Researcher */}
                <Link href="/app/research" className="group relative flex flex-col items-start p-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="p-4 rounded-full bg-[#1f464d]/40 text-[#4ad3e8] mb-6 group-hover:scale-110 transition-transform">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Researcher</h3>
                  <p className="text-sm text-zinc-400 font-light">Query historical NetCDF data, compare zones, and extract CSV models.</p>
                </Link>

                {/* Coastal Operator */}
                <Link href="/app/map" className="group relative flex flex-col items-start p-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="p-4 rounded-full bg-[#f97316]/20 text-[#f97316] mb-6 group-hover:scale-110 transition-transform">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Operator</h3>
                  <p className="text-sm text-zinc-400 font-light">Monitor boundaries, manage safety alerts, and supervise active zones.</p>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
