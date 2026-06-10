import { useEffect, useState } from "react";
import VaporizeTextCycle, { Tag } from "./VaporizeTextCycle";
export default function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  // vaporize takes 1.8s → start fade right after, unmount after fade
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1900);
    const t2 = setTimeout(() => { setGone(true); onDone?.(); }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  const bg = "#09090b";
  const textColor = "rgb(255, 255, 255)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.8s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <div style={{ width: "100vw", height: "220px" }}>
        <VaporizeTextCycle
          texts={["WheelWise"]}
          font={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontSize: "72px",
            fontWeight: 700,
          }}
          color={textColor}
          spread={5}
          density={6}
          animation={{ vaporizeDuration: 1.8, fadeInDuration: 1, waitDuration: 99 }}
          direction="left-to-right"
          alignment="center"
          tag={Tag.H1}
        />
      </div>
    </div>
  );
}
