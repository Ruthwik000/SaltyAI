"use client";

import * as React from "react";
import { ExternalLink, LoaderCircle, PhoneCall, X } from "lucide-react";
import { CALL_AGENT_BASE, checkCallAgent, startExotelCall } from "@/lib/api";
import { useMarine } from "@/lib/marine-context";

type ConnectionState = "idle" | "checking" | "online" | "offline";

export function CallAgentLauncher() {
  const { phoneNumber, setPhoneNumber } = useMarine();
  const [isOpen, setIsOpen] = React.useState(false);
  const [connection, setConnection] = React.useState<ConnectionState>("idle");
  const [error, setError] = React.useState("");
  const [callMessage, setCallMessage] = React.useState("");
  const [calling, setCalling] = React.useState(false);
  const [phoneInput, setPhoneInput] = React.useState(phoneNumber);

  React.useEffect(() => {
    if (!isOpen) return;
    setPhoneInput(phoneNumber);
    let cancelled = false;

    // State is set only from the promise callbacks. "Checking" is applied when
    // the dialog is opened, so nothing is written synchronously in the effect
    // body — that would queue a cascading render.
    checkCallAgent()
      .then(() => {
        if (cancelled) return;
        setConnection("online");
        setError("");
      })
      .catch((checkError: unknown) => {
        if (cancelled) return;
        setConnection("offline");
        setError(
          checkError instanceof Error ? checkError.message : "Call Agent is unavailable"
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, phoneNumber]);

  const startCall = async () => {
    const normalizedPhone = phoneInput.replace(/[\s()-]/g, "");
    if (!/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError("Enter a valid phone number with country code, for example +91 98765 43210.");
      return;
    }
    if (connection !== "online" || calling) return;
    setPhoneNumber(normalizedPhone);
    setCalling(true);
    setError("");
    setCallMessage("");
    try {
      const result = await startExotelCall(normalizedPhone);
      setCallMessage(result.message);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "Could not start Exotel call");
    } finally {
      setCalling(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConnection("checking");
          setError("");
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs transition-colors hover:bg-emerald-100"
        title="Open the SALTY voice call agent"
      >
        <PhoneCall className="h-3.5 w-3.5" />
        <span>Call Agent</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close call agent dialog"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="call-agent-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <PhoneCall className="h-4 w-4 text-emerald-600" />
                  <h2 id="call-agent-title">SALTY Voice Call Agent</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Calls are handled by the Exotel voice gateway and answered using the SALTY marine LLM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
              <span className="text-zinc-500">Gateway status</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connection === "online"
                      ? "bg-emerald-500"
                      : connection === "checking"
                        ? "bg-amber-400"
                        : "bg-zinc-300"
                  }`}
                />
                {connection === "checking" ? "Checking…" : connection === "online" ? "Online" : connection === "offline" ? "Offline" : "Not checked"}
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs">
              <label htmlFor="call-agent-phone" className="block font-medium text-zinc-600">
                Destination phone number
              </label>
              <input
                id="call-agent-phone"
                type="tel"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  if (error) setError("");
                }}
                placeholder="+91 98765 43210"
                className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
              />
              <span className="mt-1 block text-[11px] text-zinc-400">
                Number with country code to receive the Exotel voice call.
              </span>
            </div>

            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

            <div className="mt-5 flex items-center justify-between gap-2">
              <a
                href={`${CALL_AGENT_BASE}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Service docs
              </a>
              <button
                type="button"
                onClick={startCall}
                disabled={!phoneInput.trim() || connection !== "online" || calling}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {(connection === "checking" || calling) && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                <PhoneCall className="h-3.5 w-3.5" />
                {calling ? "Starting call…" : "Call via Exotel"}
              </button>
            </div>
            {callMessage && <p className="mt-3 text-xs text-emerald-700">{callMessage}</p>}
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
              Exotel will call this number and connect it to the SALTY voice agent. No SIP or browser phone app is used.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
