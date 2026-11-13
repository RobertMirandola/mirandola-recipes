import { ImageResponse } from "next/og";

/** A square mark: cream ground, the letter M in the recipe accent. */
export function appIcon(size: number): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf6ef",
        color: "#a8481f",
        fontSize: Math.round(size * 0.58),
        lineHeight: 1,
      }}
    >
      M
    </div>,
    { width: size, height: size },
  );
}
