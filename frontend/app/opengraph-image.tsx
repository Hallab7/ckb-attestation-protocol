import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "AttestCKB";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          color: "#111111",
          padding: "56px",
          fontFamily: "Georgia, Times New Roman, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              width: 132,
              height: 132,
              border: "2px solid #111111",
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", inset: 16, border: "2px solid #111111", borderRadius: 20 }} />
            <div style={{ position: "absolute", left: 36, top: 36, width: 60, height: 60, borderLeft: "14px solid #111111", borderTop: "14px solid transparent", borderRight: "14px solid #111111", borderBottom: "14px solid #111111", transform: "skewX(-10deg) rotate(45deg)" }} />
            <div style={{ position: "absolute", left: 36, top: 58, width: 68, height: 14, background: "#111111" }} />
            <div style={{ position: "absolute", right: 22, bottom: 24, width: 26, height: 26, borderRight: "10px solid #111111", borderBottom: "10px solid #111111", transform: "rotate(45deg)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 84,
                lineHeight: 0.92,
                fontWeight: 600,
                letterSpacing: "-0.08em",
              }}
            >
              AttestCKB
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: 24,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#555555",
              }}
            >
              Verifiable attestations on CKB
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "24px",
            borderTop: "1px solid #e8e8e8",
            paddingTop: "24px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div style={{ maxWidth: 680, fontSize: 34, lineHeight: 1.35, color: "#111111" }}>
            A minimal editorial interface for issuing, verifying, and revoking on-chain claims.
          </div>
          <div style={{ fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: "#555555" }}>
            AttestCKB
          </div>
        </div>
      </div>
    ),
    size
  );
}
