import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export const runtime = "nodejs";

export default async function Icon() {
  const fontData = await readFile(
    join(process.cwd(), "public/fonts/Torus-SemiBold.otf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#121318",
          color: "#ffffff",
          fontSize: 10,
          fontFamily: "Torus",
          fontWeight: 600,
          letterSpacing: "-0.03em",
        }}
      >
        osu!
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Torus",
          data: new Uint8Array(fontData).buffer,
          style: "normal",
          weight: 600,
        },
      ],
    }
  );
}
