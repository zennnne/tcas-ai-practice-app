import { ImageResponse } from "next/og";

export const alt = "TCAS AI — เตรียมสอบให้ตรงจุด";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette from Paper & Pencil theme (globals.css)
const C = {
  paper: "#FBFAF6",
  panel: "#F3EFE6",
  ruled: "#E7E1D4",
  ink: "#18223B",
  inkSoft: "#5C6479",
  pen: "#2F5BFF",
  mark: "#FFDC4A",
  graphite: "#C7C0B0",
} as const;

// 4 OMR bubbles shown in the hero (ก ข ค ง)
const BUBBLE_LABELS = ["ก", "ข", "ค", "ง"];

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: C.paper,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Ruled paper lines */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 8 + i * 38,
              height: 1,
              backgroundColor: "#ECE6D8",
            }}
          />
        ))}

        {/* Left red margin line (notebook-style) */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: "rgba(239,68,68,0.25)",
          }}
        />

        {/* Content area (left of the decorative bubbles) */}
        <div
          style={{
            position: "absolute",
            left: 112,
            top: 0,
            bottom: 0,
            right: 360,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: C.pen,
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                letterSpacing: "0.12em",
                color: C.inkSoft,
                textTransform: "uppercase",
              }}
            >
              AI Practice · TCAS 69
            </span>
          </div>

          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: C.ink,
                letterSpacing: "-0.02em",
              }}
            >
              TCAS
            </span>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: C.pen,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "monospace",
                }}
              >
                ai
              </span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
            <span
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: C.ink,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              เตรียมสอบ TCAS
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: C.ink,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                }}
              >
                ให้{" "}
              </span>
              {/* Highlighter mark effect */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: -4,
                    right: -4,
                    height: 26,
                    backgroundColor: C.mark,
                    borderRadius: "3px 6px 4px 7px",
                    transform: "rotate(-1.2deg)",
                  }}
                />
                <span
                  style={{
                    fontSize: 64,
                    fontWeight: 800,
                    color: C.ink,
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                    position: "relative",
                  }}
                >
                  ตรงจุด
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <span
            style={{
              fontSize: 22,
              color: C.inkSoft,
              lineHeight: 1.5,
              maxWidth: 540,
            }}
          >
            AI วิเคราะห์จุดอ่อน · สร้างโจทย์ตรงจุด · ประเมินโอกาสติดคณะ
          </span>
        </div>

        {/* Right panel: OMR answer sheet decoration */}
        <div
          style={{
            position: "absolute",
            right: 60,
            top: 0,
            bottom: 0,
            width: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: C.paper,
              border: `1.5px solid ${C.ruled}`,
              borderRadius: 20,
              padding: "28px 24px",
              width: 260,
              boxShadow: "0 24px 60px -20px rgba(24,34,59,0.22)",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {/* Sheet header */}
            <div
              style={{
                borderBottom: `1px dashed ${C.ruled}`,
                paddingBottom: 16,
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: C.inkSoft,
                  textTransform: "uppercase",
                }}
              >
                กระดาษคำตอบ
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                ฟิสิกส์ · กลศาสตร์
              </span>
            </div>

            {/* Question text */}
            <span
              style={{
                fontSize: 11,
                color: C.ink,
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              วัตถุมวล 2 kg ถูกแรง 10 N จงหาความเร่ง
            </span>

            {/* Bubble rows */}
            {(["07", "08", "09", "10"] as const).map((n, rowIdx) => {
              const answerIdx = [1, 3, 2, 0][rowIdx];
              const isDone = rowIdx < 2;
              const isFilling = rowIdx === 2;
              return (
                <div
                  key={n}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      color: C.inkSoft,
                      width: 22,
                    }}
                  >
                    {n}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {BUBBLE_LABELS.map((label, i) => {
                      const isAnswer = i === answerIdx;
                      const filled = isAnswer && isDone;
                      const filling = isAnswer && isFilling;
                      return (
                        <div
                          key={label}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            border: `1.5px solid ${filled || filling ? C.pen : C.graphite}`,
                            backgroundColor: filled ? C.pen : filling ? "rgba(47,91,255,0.55)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 9,
                              fontWeight: 600,
                              color: filled || filling ? "#fff" : C.graphite,
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {isDone && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ marginLeft: "auto", color: "#16A34A" }}
                    >
                      <path
                        d="M3 8.5l3.5 3.5L13 4.5"
                        stroke="#16A34A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              );
            })}

            {/* Footer */}
            <div
              style={{
                borderTop: `1px dashed ${C.ruled}`,
                paddingTop: 14,
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: C.pen,
                }}
              />
              <span style={{ fontSize: 10, color: C.inkSoft }}>
                AI สร้าง · ตรวจซ้ำ 2 โมเดล
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
