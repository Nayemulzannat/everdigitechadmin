"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTicketFeed, type TicketFeed, type TicketFeedEvent } from "@/lib/api/ticket-feed";
import { ticketKeys } from "@/lib/api/tickets";
import { toast } from "@/lib/toast";

/** How often the panel asks for new tickets while the tab is open and visible. */
export const TICKET_POLL_MS = 20_000;

const SOUND_KEY = "everdigitech:ticket-sound";
const DESKTOP_KEY = "everdigitech:ticket-desktop";

export interface TicketAlerts {
  /** Tickets waiting for support. */
  waiting: number;
  /** Whether the live check is running (the staff member may read tickets). */
  live: boolean;
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
  /** Desktop (browser) notifications: the permission the browser gave, and whether the staff member turned them on. */
  desktopSupported: boolean;
  desktopPermission: NotificationPermission | "unsupported";
  desktopOn: boolean;
  enableDesktop: () => Promise<void>;
  disableDesktop: () => void;
}

const IDLE: TicketAlerts = {
  waiting: 0,
  live: false,
  soundOn: false,
  setSoundOn: () => {},
  desktopSupported: false,
  desktopPermission: "unsupported",
  desktopOn: false,
  enableDesktop: async () => {},
  disableDesktop: () => {},
};

const TicketAlertsContext = createContext<TicketAlerts>(IDLE);

export const useTicketAlerts = () => useContext(TicketAlertsContext);

function read(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}

function write(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Storage can be blocked (private window): the choice then lasts until the page is closed.
  }
}

/** One audio context for the whole page. A browser only lets it make sound after the person has clicked on the page once. */
let audio: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audio ??= new AudioContextClass();
    if (audio.state === "suspended") void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

/** A short two-note chime made in the browser, so no sound file is needed. It also plays while this tab is in the background. */
function chime() {
  const context = audioContext();
  if (!context || context.state !== "running") return;
  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.16;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.28);
  });
}

const FEED_KEY = [...ticketKeys.all, "feed"];

const describe = (event: TicketFeedEvent) =>
  event.kind === "new_ticket"
    ? { title: `New ticket ${event.number}`, body: `${event.subject} · ${event.accountName ?? event.authorName ?? "a client"}` }
    : { title: `Client replied on ${event.number}`, body: `${event.subject} · ${event.authorName ?? event.accountName ?? "a client"}` };

/**
 * Keeps the admin panel up to date with tickets without a reload. Every 20 seconds, also while this tab is in the
 * background, and at once when the tab is opened again, it asks the API what is new. (The beat comes from a Web Worker:
 * browsers slow down timers of background tabs to about once a minute, but not those of workers.) A new ticket or client reply shows a toast,
 * a chime and, if the staff member allowed it, a desktop notification; the ticket list, an open ticket and the
 * "waiting" number on the menu update themselves. Polling is plain HTTP, so it needs nothing extra on the server.
 */
export function TicketAlertsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const cursor = useRef<number | null>(null);
  // This provider only mounts once the signed-in user is known (in the browser), never during the server render, so the
  // saved settings can be read right away without a hydration mismatch.
  const [soundOn, setSoundState] = useState(() => read(SOUND_KEY, true));
  const [desktopOn, setDesktopState] = useState(() => read(DESKTOP_KEY, false));
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => ("Notification" in window ? Notification.permission : "unsupported"));

  const soundRef = useRef(soundOn);
  const desktopRef = useRef(desktopOn);
  useEffect(() => {
    soundRef.current = soundOn;
    desktopRef.current = desktopOn;
  }, [soundOn, desktopOn]);

  const open = useCallback((ticketId: string) => router.push(`/tickets/${ticketId}`), [router]);

  const announce = useCallback(
    (events: TicketFeedEvent[]) => {
      if (events.length === 0) return;

      // One toast per event, at most three, then a single summary so a burst never covers the screen.
      events.slice(0, 3).forEach((event) => {
        const { title, body } = describe(event);
        toast({ title, description: body, tone: event.priority === "high" ? "warning" : "info" });
      });
      if (events.length > 3) toast({ title: `${events.length - 3} more new messages`, description: "Open Support tickets to see them.", tone: "info" });

      if (soundRef.current) chime();

      if (desktopRef.current && "Notification" in window && Notification.permission === "granted") {
        events.slice(0, 3).forEach((event) => {
          const { title, body } = describe(event);
          const notification = new Notification(title, { body, tag: `ticket-${event.replyId}` });
          notification.onclick = () => {
            window.focus();
            open(event.ticketId);
            notification.close();
          };
        });
      }

      // Lists, the ticket on screen and the counts all change when a client writes.
      void queryClient.invalidateQueries({ queryKey: [...ticketKeys.all, "list"] });
      new Set(events.map((e) => e.ticketId)).forEach((id) => void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }));
    },
    [open, queryClient],
  );

  const { data } = useQuery<TicketFeed>({
    queryKey: FEED_KEY,
    enabled,
    queryFn: async () => {
      const feed = await getTicketFeed(cursor.current);
      const first = cursor.current === null;
      cursor.current = feed.cursor;
      if (!first) announce(feed.events);
      return feed;
    },
    // The beat is the worker below, so it also runs in a background tab.
    refetchInterval: false,
    refetchOnWindowFocus: true,
    // A failed check is simply tried again at the next beat; it must not toast or retry in a burst.
    retry: false,
    staleTime: 0,
  });

  const waiting = data?.waiting ?? 0;

  // The beat: every 20 seconds, asks again. A worker is not slowed down when the tab is hidden.
  useEffect(() => {
    if (!enabled) return;
    const check = () => void queryClient.refetchQueries({ queryKey: FEED_KEY });
    let worker: Worker | null = null;
    let fallback: number | undefined;

    try {
      const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${TICKET_POLL_MS});`], { type: "text/javascript" }));
      worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = check;
    } catch {
      fallback = window.setInterval(check, TICKET_POLL_MS); // a browser without workers: slower in a background tab, but still works
    }

    return () => {
      worker?.terminate();
      window.clearInterval(fallback);
    };
  }, [enabled, queryClient]);

  // The first click anywhere on the page unlocks sound, so a chime can play later when the tab is in the background.
  useEffect(() => {
    const unlock = () => void audioContext();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // "(3) Support tickets": the number of tickets waiting in the tab title, so it shows in other tabs and the taskbar.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      const base = document.title.replace(/^\(\d+\)\s+/, "");
      document.title = waiting > 0 ? `(${waiting}) ${base}` : base;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, waiting, pathname]);

  const setSoundOn = useCallback((on: boolean) => {
    setSoundState(on);
    write(SOUND_KEY, on);
    if (on) chime(); // lets them hear it, and satisfies the browser's "after a click" rule
  }, []);

  const enableDesktop = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setPermission(result);
    const on = result === "granted";
    setDesktopState(on);
    write(DESKTOP_KEY, on);
  }, []);

  const disableDesktop = useCallback(() => {
    setDesktopState(false);
    write(DESKTOP_KEY, false);
  }, []);

  const value = useMemo<TicketAlerts>(
    () => ({
      waiting,
      live: enabled,
      soundOn,
      setSoundOn,
      desktopSupported: permission !== "unsupported",
      desktopPermission: permission,
      desktopOn: desktopOn && permission === "granted",
      enableDesktop,
      disableDesktop,
    }),
    [waiting, enabled, soundOn, setSoundOn, permission, desktopOn, enableDesktop, disableDesktop],
  );

  return <TicketAlertsContext.Provider value={value}>{children}</TicketAlertsContext.Provider>;
}
