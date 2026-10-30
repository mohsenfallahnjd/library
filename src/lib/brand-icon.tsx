import { ImageResponse } from "next/og";

/** The app icon (three books, the last one orange) as a PNG of any size. */
export function brandIcon(size: number, { padded = false } = {}) {
  const inset = padded ? size * 0.1 : 0;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", background: "#18181b", padding: inset }}>
        <svg width={size - inset * 2} height={size - inset * 2} viewBox="0 0 64 64">
          <path d="M16 18h8v28h-8zM28 18h8v28h-8z" fill="#ececef" />
          <path d="M39 20.5l7.7-2.1 7.3 27.1-7.7 2.1z" fill="#fb923c" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
