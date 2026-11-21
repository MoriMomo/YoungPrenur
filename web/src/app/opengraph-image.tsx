import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MDIP: Manufacturing Decision Intelligence";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 40,
          backgroundColor: "#f3f5f1",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 48,
            backgroundColor: "#fbfcfa",
            border: "2px solid #aab6ac",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "8px 16px",
                backgroundColor: "#e7eaf8",
                border: "1px solid #c2c9ef",
                color: "#2b3fbf",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              MDIP · CERTIFICATE OF SCHEDULE INSPECTION
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#5f6870",
              }}
            >
              MDIP-DR-0001
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                lineHeight: 1.05,
                color: "#14181c",
                textTransform: "uppercase",
              }}
            >
              Know which tasks will slip before the work cell stalls
            </div>
            <div
              style={{
                fontSize: 24,
                color: "#3b434b",
                lineHeight: 1.4,
              }}
            >
              Every task&apos;s forecast measured against its plan, a delay-risk verdict with reasons, and supervisor HITL sign-off.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid #d5ddd6",
              paddingTop: 20,
              fontSize: 18,
              color: "#5f6870",
            }}
          >
            <span>CPM Critical Path · XGBoost Delay-Risk (ROC-AUC 0.78) · Cited SOP Copilot</span>
            <span style={{ color: "#2a7449", fontWeight: 700 }}>AUDIT-READY</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
