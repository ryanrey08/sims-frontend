"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Code 39 patterns: n = narrow, w = wide; bars and spaces alternate starting with a bar.
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw",
  W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
};

/** Dependency-free Code 39 barcode as SVG. */
export function Barcode({ value, height = 44, className }: { value: string; height?: number; className?: string }) {
  const text = `*${value.toUpperCase().replace(/[^0-9A-Z\-. ]/g, "")}*`;
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (const char of text) {
    const pattern = CODE39[char];
    if (!pattern) continue;
    [...pattern].forEach((unit, index) => {
      const width = unit === "w" ? 3 : 1;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += 1;
  }
  return (
    <svg viewBox={`0 0 ${x} ${height}`} className={className ?? "h-11 w-full"} preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`}>
      {bars.map((bar, index) => <rect key={index} x={bar.x} y={0} width={bar.width} height={height} fill="#111" />)}
    </svg>
  );
}

export function QrImage({ value, size = 96 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toString(value, { type: "svg", margin: 0, width: size }).then((markup) => active && setSvg(markup));
    return () => {
      active = false;
    };
  }, [value]);
  return <span className="block [&>svg]:h-full [&>svg]:w-full" style={{ width: size, height: size }} role="img" aria-label={`QR code for ${value}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

