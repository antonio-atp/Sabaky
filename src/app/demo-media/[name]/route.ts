import * as icons from "lucide-static";

/**
 * Generated catalogue artwork for the demo/seed data (no third-party image
 * hosts, no copyright issues). Real sellers upload photos through
 * /api/v1/uploads → object storage → CDN.
 *
 * URL: /demo-media/<IconName>-<hue>.svg   e.g. /demo-media/Headphones-165.svg
 */
const iconLibrary = icons as unknown as Record<string, string>;

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const match = /^([A-Za-z0-9]+)-(\d{1,3})(?:-(\d))?\.svg$/.exec(name);
  if (!match) return new Response("Not found", { status: 404 });

  const [, iconName, hueRaw, variantRaw] = match;
  const hue = Number(hueRaw) % 360;
  const variant = Number(variantRaw ?? 0);
  const raw = iconLibrary[iconName] ?? iconLibrary.Package;
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

  const bgA = `hsl(${hue} 70% 96%)`;
  const bgB = `hsl(${(hue + 25) % 360} 65% 88%)`;
  const ink = `hsl(${hue} 55% 32%)`;
  const accent = `hsl(${(hue + 40) % 360} 80% 62%)`;
  const angle = [0, 25, -20, 12][variant % 4];
  const scale = [13, 11.5, 12.5, 12][variant % 4];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="${ink}" flood-opacity="0.22"/></filter>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <circle cx="${480 - variant * 40}" cy="${110 + variant * 30}" r="${90 + variant * 10}" fill="${accent}" opacity="0.18"/>
  <circle cx="${110 + variant * 25}" cy="500" r="130" fill="#fff" opacity="0.35"/>
  <ellipse cx="300" cy="470" rx="150" ry="22" fill="${ink}" opacity="0.10"/>
  <circle cx="300" cy="290" r="210" fill="url(#glow)"/>
  <g filter="url(#shadow)" transform="translate(300 285) rotate(${angle}) scale(${scale}) translate(-12 -12)" fill="none" stroke="${ink}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
