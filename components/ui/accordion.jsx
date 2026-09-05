"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const AccordionContext = React.createContext(undefined);

export function Accordion({
  type = "single",
  collapsible = true,
  defaultValue,
  children,
  className,
}) {
  const [openItems, setOpenItems] = React.useState(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleItem = React.useCallback(
    (value) => {
      setOpenItems((prev) => {
        const isOpen = prev.includes(value);
        if (type === "single") {
          if (isOpen && collapsible) return [];
          return [value];
        } else {
          if (isOpen) return prev.filter((item) => item !== value);
          return [...prev, value];
        }
      });
    },
    [type, collapsible]
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div
        className={cn(
          "divide-y divide-zinc-200/80 border-y border-zinc-200/80",
          className
        )}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

const AccordionItemContext = React.createContext(undefined);

export function AccordionItem({ value, children, className }) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={cn("border-b border-zinc-200/60 last:border-b-0", className)}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({ children, className }) {
  const accContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);

  if (!accContext || !itemContext) {
    throw new Error("AccordionTrigger must be used inside Accordion and AccordionItem");
  }

  const isOpen = accContext.openItems.includes(itemContext.value);

  return (
    <button
      type="button"
      onClick={() => accContext.toggleItem(itemContext.value)}
      className={cn(
        "flex w-full items-center justify-between py-4 text-left text-sm font-medium transition-all hover:text-zinc-950 cursor-pointer",
        isOpen ? "text-zinc-950" : "text-zinc-700",
        className
      )}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
          isOpen && "rotate-180 text-zinc-900"
        )}
      />
    </button>
  );
}

export function AccordionContent({ children, className }) {
  const accContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);

  if (!accContext || !itemContext) {
    throw new Error("AccordionContent must be used inside Accordion and AccordionItem");
  }

  const isOpen = accContext.openItems.includes(itemContext.value);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "overflow-hidden text-sm text-zinc-600 pb-4 pt-1 transition-all leading-relaxed",
        className
      )}
    >
      {children}
    </div>
  );
}
