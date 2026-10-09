// Draws the membership card as a PNG at true ID-card size (ISO/IEC 7810 ID-1,
// 85.6 x 54 mm) at 300 dpi, as a single one-sided card. The file is
// tagged 300 dpi, so printing at "actual size" gives a real card-sized print.

export type CardImageData = {
  systemName: string;
  studentName: string;
  studentId: string;
  school: string;
  yearOfStudy: string;
  academicYear: string;
  term: string;
  validUntil: string;
  courses: Array<{ name: string; school?: string }>;
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
};

const DPI = 300;
const W = Math.round((85.6 / 25.4) * DPI); // 1011
const H = Math.round((54 / 25.4) * DPI); // 638
const MARGIN = 40;
const FONT = '"Public Sans", Arial, sans-serif';
const BLUE_DARK = "#0d47a1";
const BLUE = "#1976d2";
const INK = "#1a2433";
const MUTED = "#5f6b7a";

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// Largest font size (down to min) that fits; ellipsis if it still doesn't
const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight = 700,
  min = Math.round(size * 0.7)
) => {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && s > min) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 1) t = t.slice(0, -1);
  if (t !== text) t = `${t.slice(0, -1)}…`;
  ctx.fillText(t, x, y);
};

const field = (ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, maxWidth: number, size = 30) => {
  ctx.fillStyle = MUTED;
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.fillStyle = INK;
  fitText(ctx, value || "-", x, y + size + 6, maxWidth, size);
};

// Draws an image to cover the box (like CSS object-fit: cover)
const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "S";

// Wraps course names into at most maxLines lines; the rest becomes "+N more"
const courseLines = (ctx: CanvasRenderingContext2D, names: string[], maxWidth: number, maxLines: number) => {
  const sep = "   •   ";
  const lines: string[] = [];
  let line = "";
  let used = 0;
  for (const name of names) {
    const next = line ? line + sep + name : name;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      used++;
      continue;
    }
    if (lines.length + 1 >= maxLines) break;
    lines.push(line || name);
    line = line ? name : "";
    used++;
  }
  if (line) lines.push(line);
  const rest = names.length - used;
  if (rest > 0) {
    let last = lines.pop() || "";
    const more = `   +${rest} more`;
    while (last && ctx.measureText(last + more).width > maxWidth) last = last.slice(0, -1);
    lines.push(last.trimEnd() + more);
  }
  return lines;
};

const drawCard = (ctx: CanvasRenderingContext2D, d: CardImageData, ox: number, oy: number) => {
  ctx.save();
  ctx.translate(ox, oy);
  roundRect(ctx, 0, 0, W, H, 32);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Header: name on the left, logo in the top-right corner
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, BLUE_DARK);
  band.addColorStop(1, BLUE);
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, 124);

  const logoBox = 92;
  const logoX = W - 32 - logoBox;
  if (d.logo) {
    ctx.save();
    roundRect(ctx, logoX, 16, logoBox, logoBox, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.clip();
    const s = Math.min((logoBox - 10) / d.logo.naturalWidth, (logoBox - 10) / d.logo.naturalHeight);
    const lw = d.logo.naturalWidth * s;
    const lh = d.logo.naturalHeight * s;
    ctx.drawImage(d.logo, logoX + (logoBox - lw) / 2, 16 + (logoBox - lh) / 2, lw, lh);
    ctx.restore();
  }
  const headerTextW = (d.logo ? logoX : W - 32) - 36 - 20;
  ctx.fillStyle = "#ffffff";
  fitText(ctx, d.systemName, 36, 66, headerTextW, 36);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText("STUDENT MEMBERSHIP CARD", 36, 100);

  // Profile photo (initials when there is none)
  const px = 32, py = 148, pw = 196, ph = 246;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 16);
  ctx.clip();
  if (d.photo) {
    drawCover(ctx, d.photo, px, py, pw, ph);
  } else {
    ctx.fillStyle = "#e3f2fd";
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = BLUE;
    ctx.font = `800 80px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(initials(d.studentName), px + pw / 2, py + ph / 2 + 28);
    ctx.textAlign = "left";
  }
  ctx.restore();
  ctx.strokeStyle = "#cfd8e3";
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pw, ph, 16);
  ctx.stroke();

  // Details
  const dx = 256;
  const dw = W - dx - 32;
  const half = dw / 2;
  ctx.fillStyle = INK;
  fitText(ctx, d.studentName, dx, 186, dw, 36, 800);
  field(ctx, "Student No.", d.studentId, dx, 226, half - 12, 28);
  field(ctx, "Year of study", d.yearOfStudy, dx + half, 226, half, 28);
  field(ctx, "School", d.school, dx, 300, dw, 26);
  field(ctx, "Academic year", d.academicYear, dx, 374, half - 12, 26);
  field(ctx, "Term", d.term, dx + half, 374, half, 26);

  // Subscribed courses across the card
  ctx.strokeStyle = "#e3e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 428);
  ctx.lineTo(W - 32, 428);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText("SUBSCRIBED COURSES", 32, 460);
  ctx.fillStyle = INK;
  ctx.font = `600 22px ${FONT}`;
  const names = (d.courses || []).map((c) => c.name).filter(Boolean);
  const lines = names.length ? courseLines(ctx, names, W - 64, 2) : ["No active courses"];
  lines.forEach((l, i) => ctx.fillText(l, 32, 494 + i * 32));

  // Footer
  ctx.fillStyle = "#e8f1fd";
  ctx.fillRect(0, H - 70, W, 70);
  ctx.fillStyle = BLUE_DARK;
  fitText(ctx, d.validUntil, 32, H - 26, W * 0.5, 24);
  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = `500 17px ${FONT}`;
  ctx.fillText("Valid only with an active subscription", W - 32, H - 28);
  ctx.textAlign = "left";

  ctx.restore();
};

// ---- PNG pHYs chunk so the image carries its 300 dpi ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const withDpi = async (png: Blob, dpi: number) => {
  const src = new Uint8Array(await png.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9); // data length
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const afterIhdr = 8 + 25; // signature + IHDR chunk
  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, afterIhdr), 0);
  out.set(chunk, afterIhdr);
  out.set(src.subarray(afterIhdr), afterIhdr + chunk.length);
  return new Blob([out], { type: "image/png" });
};

export const renderMembershipCardPng = async (d: CardImageData): Promise<Blob> => {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W + MARGIN * 2;
  canvas.height = H + MARGIN * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCard(ctx, d, MARGIN, MARGIN);

  // Thin outline to cut along
  ctx.strokeStyle = "#c7d2de";
  ctx.lineWidth = 2;
  roundRect(ctx, MARGIN, MARGIN, W, H, 32);
  ctx.stroke();

  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image"))), "image/png")
  );
  return withDpi(png, DPI);
};
