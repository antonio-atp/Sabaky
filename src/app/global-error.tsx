"use client";

/** Last-resort boundary when the root layout itself fails (providers unavailable → plain English). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f5f7f6" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ color: "#52635e" }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 12, padding: "10px 18px", borderRadius: 10, border: 0, background: "#0a8c6f", color: "#fff", fontWeight: 600 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
