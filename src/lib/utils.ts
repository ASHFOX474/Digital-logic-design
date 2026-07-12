import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a unique id without relying on `crypto.randomUUID`, which only exists in secure
 * contexts (HTTPS or localhost). Opening the app from a phone over a plain-HTTP LAN address —
 * e.g. a dev server reached at http://192.168.x.x:PORT — is not a secure context, so
 * `crypto.randomUUID` is undefined there and throws the moment it's called. This falls back to
 * `crypto.getRandomValues` (broadly available even outside secure contexts) and, failing that,
 * to Math.random, so id generation never throws regardless of how the page is served.
 */
export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through to the manual generator below
    }
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
