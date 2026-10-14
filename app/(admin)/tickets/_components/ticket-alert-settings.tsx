"use client";

import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui";
import { TICKET_POLL_MS, useTicketAlerts } from "@/components/providers/ticket-alerts-provider";

/**
 * "Live" status and the two alert switches: a chime, and desktop notifications (which show even when the admin panel
 * is in another tab). The settings are per browser.
 */
export function TicketAlertSettings() {
  const alerts = useTicketAlerts();

  if (!alerts.live) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted" title={`Checks for new tickets every ${TICKET_POLL_MS / 1000} seconds while the admin panel is open in the browser`}>
        <span aria-hidden="true" className="size-2 animate-pulse rounded-pill bg-success" />
        Live
      </span>

      <Button
        variant="secondary"
        size="sm"
        aria-pressed={alerts.soundOn}
        leadingIcon={alerts.soundOn ? <Volume2 aria-hidden="true" className="size-4" /> : <VolumeX aria-hidden="true" className="size-4" />}
        onClick={() => alerts.setSoundOn(!alerts.soundOn)}
      >
        Sound {alerts.soundOn ? "on" : "off"}
      </Button>

      {alerts.desktopSupported ? (
        alerts.desktopPermission === "denied" ? (
          <span className="text-xs text-text-muted" title="Allow notifications for this site in the browser settings">
            Desktop alerts are blocked in this browser
          </span>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={alerts.desktopOn}
            leadingIcon={alerts.desktopOn ? <Bell aria-hidden="true" className="size-4" /> : <BellOff aria-hidden="true" className="size-4" />}
            onClick={() => (alerts.desktopOn ? alerts.disableDesktop() : void alerts.enableDesktop())}
          >
            Desktop alerts {alerts.desktopOn ? "on" : "off"}
          </Button>
        )
      ) : null}
    </div>
  );
}
