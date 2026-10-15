"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { clearShowcase, loadShowcase, seedShowcase, type ShowcaseFixture, type ShowcaseState } from "@/lib/showcase";

const ShowcaseContext = createContext<ShowcaseFixture | null>(null);

/** The fixture, once loaded and seeded; null on the server and until then. */
export function useShowcase(): ShowcaseFixture | null {
  return useContext(ShowcaseContext);
}

/*
 * The viewer's stores are module singletons, so every showcase on the page
 * shares one session. A provider given a `state` owns the session and
 * re-seeds it whenever that state changes; one without only makes sure there
 * is a session to show. The last provider to unmount empties the stores, so
 * the real viewer never starts from fixture data.
 */
let users = 0;
let seededFor: ShowcaseFixture | null = null;

export function ShowcaseProvider({ state, children }: { state?: ShowcaseState; children: ReactNode }) {
  const [fixture, setFixture] = useState<ShowcaseFixture | null>(null);
  const [ready, setReady] = useState(false);
  const status = state?.status;
  const saves = state?.saves ?? 0;

  useEffect(() => {
    let alive = true;
    users += 1;
    void loadShowcase().then((loaded) => {
      if (alive) setFixture(loaded);
    });
    return () => {
      alive = false;
      users -= 1;
      if (users === 0) {
        clearShowcase(seededFor);
        seededFor = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!fixture) return;
    if (status !== undefined) {
      seedShowcase(fixture, { status, saves });
      seededFor = fixture;
    } else if (seededFor === null) {
      seedShowcase(fixture, { status: "active" });
      seededFor = fixture;
    }
    setReady(true);
  }, [fixture, status, saves]);

  return <ShowcaseContext.Provider value={ready ? fixture : null}>{children}</ShowcaseContext.Provider>;
}
