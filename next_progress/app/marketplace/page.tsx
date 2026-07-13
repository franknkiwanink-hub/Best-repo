"use client";

import { useEffect, useRef, useState } from "react";
import { useFeed } from "@/lib/useFeed";
import type { Listing } from "@/lib/listings";
import ListingCard from "@/components/marketplace/ListingCard";

// Placeholder handlers for now — the listing detail modal and seller
// profile popup (mpOpenModal / mpOpenSellerModal in the original) are a
// separate future step. For now these just track state so clicking a card
// doesn't silently no-op while we build the grid.
function useCardHandlers() {
  const [openListing, setOpenListing] = useState<Listing | null>(null);
  const [openSellerId, setOpenSellerId] = useState<string | undefined>(undefined);

  return {
    openListing,
    openSellerId,
    onOpen: (listing: Listing) => setOpenListing(listing),
    onOpenSeller: (ownerId: string | undefined) => setOpenSellerId(ownerId),
    closeListing: () => setOpenListing(null),
    closeSeller: () => setOpenSellerId(undefined),
  };
}

export default function MarketplacePage() {
  const { listings, loading, loadingMore, error, exhausted, loadMore, reset } = useFeed({ pageSize: 24 });
  const { openListing, openSellerId, onOpen, onOpenSeller, closeListing, closeSeller } = useCardHandlers();

  // Infinite scroll — mirrors _setupSentinel's IntersectionObserver +
  // rootMargin: '200px' pattern exactly.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div style={{ marginTop: 92, padding: "0 24px 80px" }}>
      <div className="mp-results">
        Showing <strong id="mpResultCount">{loading ? "—" : listings.length}</strong>
      </div>

      <div className="mp-grid-wrap">
        <div className="mp-grid" id="mpGrid">
          {loading ? (
            <div className="mp-state" id="mpLoading">
              <div className="mp-spinner" />
              <div className="mp-state-title">Loading listings…</div>
              <div className="mp-state-desc">Fetching the latest from the marketplace</div>
            </div>
          ) : error ? (
            <div className="mp-state" id="mpError" style={{ display: "flex" }}>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
              </svg>
              <div className="mp-state-title">Something went wrong</div>
              <div className="mp-state-desc">Could not load listings. Tap Try Again.</div>
              <button
                id="mpRetryBtn"
                style={{
                  marginTop: "0.9rem",
                  padding: "0.55rem 1.4rem",
                  background: "rgba(163,230,53,0.1)",
                  border: "1.5px solid rgba(163,230,53,0.4)",
                  borderRadius: "2rem",
                  color: "#a3e635",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.02em",
                }}
                onClick={reset}
              >
                Try Again
              </button>
            </div>
          ) : !listings.length ? (
            <div className="mp-state" id="mpEmpty" style={{ display: "flex" }}>
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <div className="mp-state-title">No listings found</div>
              <div className="mp-state-desc">Try adjusting your search or filters.</div>
            </div>
          ) : (
            listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} onOpen={onOpen} onOpenSeller={(uid) => onOpenSeller(uid)} />
            ))
          )}
        </div>

        <div ref={sentinelRef} id="mpLoadSentinel" />
        {loadingMore ? (
          <div id="mpLoadMoreSpinner" style={{ display: "flex" }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2.2"
              style={{ animation: "mp-spin 1s linear infinite", flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
            </svg>
            Loading more…
          </div>
        ) : exhausted && listings.length ? (
          <div style={{ textAlign: "center", padding: "16px 0", opacity: 0.5, fontSize: 13 }}>
            You&apos;ve reached the end of the marketplace.
          </div>
        ) : null}
      </div>

      {/* Listing detail / seller profile modals are a separate future step
          (mpOpenModal / mpOpenSellerModal in the original). This is a bare
          placeholder so clicking a card gives visible feedback in the
          meantime, rather than silently doing nothing. */}
      {openListing ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={closeListing}
        >
          <div style={{ background: "#141420", padding: 24, borderRadius: 12, color: "#fff", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{openListing.title}</h3>
            <p style={{ opacity: 0.7, fontSize: 14 }}>
              Full listing detail modal is a separate step — this is a placeholder confirming the click handler works.
            </p>
            <button onClick={closeListing}>Close</button>
          </div>
        </div>
      ) : null}
      {openSellerId ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={closeSeller}
        >
          <div style={{ background: "#141420", padding: 24, borderRadius: 12, color: "#fff", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Seller: {openSellerId}</h3>
            <p style={{ opacity: 0.7, fontSize: 14 }}>
              Full seller profile popup is a separate step — this is a placeholder confirming the click handler works.
            </p>
            <button onClick={closeSeller}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
