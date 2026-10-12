// Draws the membership card as a PNG at true ID-card size (ISO/IEC 7810 ID-1,
// 85.6 x 54 mm) at 300 dpi, as a single one-sided card. The file is
// tagged 300 dpi, so printing at "actual size" gives a real card-sized print.
// The layout mirrors the on-screen card in MembershipCardPage.

export type CardImageData = {
  systemName: string;
  studentName: string;
  studentId: string;
  programme: string;
  yearOfStudy: string;
  academicYear: string;
  courses: Array<{ name: string; school?: string }>;
  amountPaid: string; // already formatted, e.g. "ZMW 450.00"
  paid: boolean;
  cardNumber: string;
  validUntil: string; // already formatted, e.g. "31 Dec 2026" or "N/A"
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
};

// Shared with the on-screen card so both look the same
export const CARD_COLORS = {
  blue: "#1b4fc6",
  ink: "#1a2433",
  label: "#8792a5",
  line: "#e3e8f0",
  pill: "#b9c6dc",
  pillText: "#2b3a55",
  soft: "#f3f6fc",
  page: "#eef2f8",
};
export const CARD_TAGLINE = "EXCELLENCE IN EDUCATION";

const DPI = 300;
const W = Math.round((85.6 / 25.4) * DPI); // 1011
const H = Math.round((54 / 25.4) * DPI); // 638
const MARGIN = 40;
const RADIUS = 28;
const FONT = '"Public Sans", Arial, sans-serif';

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// Letter spacing where the browser supports it (ignored elsewhere)
const setSpacing = (ctx: CanvasRenderingContext2D, px: number) => {
  (ctx as any).letterSpacing = `${px}px`;
};

const ellipsize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
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
  ctx.fillText(ellipsize(ctx, text, maxWidth), x, y);
};

const breakLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

// Wraps text into at most maxLines lines, shrinking the font down to min first
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  size: number,
  weight: number,
  min: number
) => {
  for (let s = size; s >= min; s--) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    const lines = breakLines(ctx, text, maxWidth);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return { lines, size: s };
    }
  }
  ctx.font = `${weight} ${min}px ${FONT}`;
  const all = breakLines(ctx, text, maxWidth);
  const lines = all.slice(0, maxLines - 1).map((l) => ellipsize(ctx, l, maxWidth));
  lines.push(ellipsize(ctx, all.slice(maxLines - 1).join(" "), maxWidth));
  return { lines, size: min };
};

const drawLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = CARD_COLORS.label, size = 15) => {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px ${FONT}`;
  setSpacing(ctx, 2);
  ctx.fillText(text.toUpperCase(), x, y);
  setSpacing(ctx, 0);
};

// Label, value and the thin divider underneath
const drawField = (
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  size = 24,
  weight = 600
) => {
  drawLabel(ctx, label, x, y);
  ctx.fillStyle = CARD_COLORS.ink;
  fitText(ctx, value || "N/A", x, y + 14 + size, width, size, weight);
  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 28 + size);
  ctx.lineTo(x + width, y + 28 + size);
  ctx.stroke();
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

// Outlined course pills in at most maxRows rows; the rest becomes "+N more"
const drawCoursePills = (
  ctx: CanvasRenderingContext2D,
  names: string[],
  x: number,
  y: number,
  maxWidth: number,
  maxRows: number
) => {
  const h = 34;
  const padX = 14;
  const gap = 10;
  ctx.font = `600 16px ${FONT}`;

  if (!names.length) {
    ctx.fillStyle = CARD_COLORS.label;
    ctx.fillText("No active courses", x, y + 23);
    return;
  }

  const widthOf = (t: string) => ctx.measureText(t).width + padX * 2;
  const rowWidth = (row: string[]) => row.reduce((sum, t, i) => sum + widthOf(t) + (i ? gap : 0), 0);
  const rows: string[][] = [[]];
  let placed = 0;
  for (const raw of names) {
    const t = ellipsize(ctx, raw, maxWidth - padX * 2);
    const row = rows[rows.length - 1];
    if (!row.length || rowWidth(row) + gap + widthOf(t) <= maxWidth) {
      row.push(t);
    } else if (rows.length < maxRows) {
      rows.push([t]);
    } else {
      break;
    }
    placed++;
  }

  let more = names.length - placed;
  if (more > 0) {
    const last = rows[rows.length - 1];
    while (last.length && rowWidth(last) + gap + widthOf(`+${more} more`) > maxWidth) {
      last.pop();
      more++;
    }
  }

  rows.forEach((row, i) => {
    const top = y + i * (h + gap);
    let left = x;
    const items = i === rows.length - 1 && more > 0 ? [...row, `+${more} more`] : row;
    items.forEach((t, j) => {
      const w = widthOf(t);
      const isMore = more > 0 && i === rows.length - 1 && j === items.length - 1;
      roundRect(ctx, left, top, w, h, h / 2);
      if (isMore) {
        ctx.fillStyle = CARD_COLORS.soft;
        ctx.fill();
      }
      ctx.strokeStyle = CARD_COLORS.pill;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = CARD_COLORS.pillText;
      ctx.fillText(t, left + padX, top + 23);
      left += w + gap;
    });
  });
};

const drawCard = (ctx: CanvasRenderingContext2D, d: CardImageData, ox: number, oy: number) => {
  ctx.save();
  ctx.translate(ox, oy);
  roundRect(ctx, 0, 0, W, H, RADIUS);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ---- Left panel: logo, name, tagline, photo, MEMBER CARD ----
  const LW = Math.round(W * 0.27);
  const cx = LW / 2;
  ctx.fillStyle = CARD_COLORS.blue;
  ctx.fillRect(0, 0, LW, H);

  const logoR = 44;
  const logoY = 84;
  ctx.beginPath();
  ctx.arc(cx, logoY, logoR + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, logoY, logoR, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  if (d.logo) {
    ctx.clip();
    const box = logoR * 2 - 14;
    const s = Math.min(box / d.logo.naturalWidth, box / d.logo.naturalHeight);
    const lw = d.logo.naturalWidth * s;
    const lh = d.logo.naturalHeight * s;
    ctx.drawImage(d.logo, cx - lw / 2, logoY - lh / 2, lw, lh);
  }
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  const name = wrapText(ctx, d.systemName.toUpperCase(), LW - 36, 2, 30, 800, 20);
  let y = 178;
  name.lines.forEach((l) => {
    ctx.fillText(l, cx, y);
    y += Math.round(name.size * 1.15);
  });

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `600 13px ${FONT}`;
  setSpacing(ctx, 2);
  const tagline = breakLines(ctx, CARD_TAGLINE, LW - 40);
  y += 2;
  tagline.slice(0, 2).forEach((l) => {
    ctx.fillText(l, cx, y);
    y += 19;
  });
  setSpacing(ctx, 0);

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 28, y + 4);
  ctx.lineTo(cx + 28, y + 4);
  ctx.stroke();

  // Student photo (initials when there is none)
  const avatarR = 64;
  const avatarY = 420;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, avatarY, avatarR, 0, Math.PI * 2);
  ctx.clip();
  if (d.photo) {
    drawCover(ctx, d.photo, cx - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(cx - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 50px ${FONT}`;
    ctx.fillText(initials(d.studentName), cx, avatarY + 18);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, avatarY, avatarR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 5;
  ctx.stroke();

  const pillW = 196;
  const pillH = 44;
  roundRect(ctx, cx - pillW / 2, 534, pillW, pillH, pillH / 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 16px ${FONT}`;
  setSpacing(ctx, 2);
  ctx.fillText("MEMBER CARD", cx, 562);
  setSpacing(ctx, 0);
  ctx.textAlign = "left";

  // ---- Right panel: details ----
  const RX = LW + 40;
  const RW = W - 40 - RX;
  const colGap = 32;
  const colW = (RW - colGap) / 2;
  const col2 = RX + colW + colGap;

  drawField(ctx, "Student name", d.studentName, RX, 58, RW, 34, 800);
  drawField(ctx, "Programme", d.programme, RX, 158, colW);
  drawField(ctx, "Year of study", d.yearOfStudy, col2, 158, colW);
  drawField(ctx, "Student ID", d.studentId, RX, 248, colW);
  drawField(ctx, "Academic year", d.academicYear, col2, 248, colW);

  drawLabel(ctx, "Enrolled courses", RX, 338);
  drawCoursePills(ctx, (d.courses || []).map((c) => c.name).filter(Boolean), RX, 352, RW, 2);

  // ---- Bottom strip: amount paid, PAID, card number, valid until ----
  const stripY = 452;
  const stripH = H - 40 - stripY;
  const amountW = 400;
  roundRect(ctx, RX, stripY, amountW, stripH, 16);
  ctx.fillStyle = CARD_COLORS.blue;
  ctx.fill();
  drawLabel(ctx, "Amount paid", RX + 24, stripY + 44, "rgba(255,255,255,0.82)");

  const badgeW = 104;
  const badgeH = 78;
  const badgeX = RX + amountW - 22 - badgeW;
  ctx.fillStyle = "#ffffff";
  fitText(ctx, d.amountPaid, RX + 24, stripY + 98, amountW - 48 - (d.paid ? badgeW + 16 : 0), 34, 800);
  if (d.paid) {
    const badgeY = stripY + (stripH - badgeH) / 2;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(badgeX + 40, badgeY + 26);
    ctx.lineTo(badgeX + 49, badgeY + 35);
    ctx.lineTo(badgeX + 65, badgeY + 18);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 18px ${FONT}`;
    ctx.textAlign = "center";
    setSpacing(ctx, 2);
    ctx.fillText("PAID", badgeX + badgeW / 2, badgeY + 62);
    setSpacing(ctx, 0);
    ctx.textAlign = "left";
  }

  const infoX = RX + amountW + 16;
  const infoW = W - 40 - infoX;
  roundRect(ctx, infoX, stripY, infoW, stripH, 16);
  ctx.fillStyle = CARD_COLORS.soft;
  ctx.fill();
  drawLabel(ctx, "Card no.", infoX + 20, stripY + 34, CARD_COLORS.label, 14);
  ctx.fillStyle = CARD_COLORS.ink;
  fitText(ctx, d.cardNumber || "N/A", infoX + 20, stripY + 64, infoW - 40, 22, 700);
  drawLabel(ctx, "Valid until", infoX + 20, stripY + 98, CARD_COLORS.label, 14);
  ctx.fillStyle = CARD_COLORS.ink;
  fitText(ctx, d.validUntil || "N/A", infoX + 20, stripY + 128, infoW - 40, 22, 700);

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
  roundRect(ctx, MARGIN, MARGIN, W, H, RADIUS);
  ctx.stroke();

  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image"))), "image/png")
  );
  return withDpi(png, DPI);
};
