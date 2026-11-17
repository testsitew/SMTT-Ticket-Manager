// SVG for Ooredoo Business Logo
const RAW_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 308 104" width="308" height="104">
  <g fill="#FFFFFF">
    <circle cx="30" cy="32" r="26" />
    <circle cx="70" cy="32" r="26" />
    <circle cx="110" cy="32" r="26" />
    <circle cx="150" cy="32" r="26" />
    <circle cx="190" cy="32" r="26" />
    <circle cx="230" cy="32" r="26" />
    <circle cx="270" cy="32" r="26" />
  </g>
  <g fill="#EB212E" font-family="'Arial Rounded MT Bold', 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="30" text-anchor="middle" dominant-baseline="central">
    <text x="30" y="31">o</text>
    <text x="70" y="31">o</text>
    <text x="110" y="31">r</text>
    <text x="150" y="31">e</text>
    <text x="190" y="31">d</text>
    <text x="230" y="31">o</text>
    <text x="270" y="31">o</text>
  </g>
  <text x="282" y="88" fill="#FFFFFF" font-family="'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="24" letter-spacing="2" text-anchor="end">business</text>
</svg>`;

// High definition transparent Ooredoo Business Logo SVG Data URL
export const OOREDOO_BUSINESS_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(RAW_SVG_STRING)}`;

// Base64 encoded SVG data URL with base64 header
export const OOREDOO_BUSINESS_LOGO_BASE64 = `data:image/svg+xml;base64,${typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(RAW_SVG_STRING))) : ''}`;

/**
 * Generates a crisp transparent PNG Base64 string for the Ooredoo Business logo.
 * Guaranteed 100% transparent background (no white rectangular box).
 */
export const getLogoPngBase64 = (width = 308, height = 104, variant: 'white_on_red' | 'red_on_white' = 'white_on_red'): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(OOREDOO_BUSINESS_LOGO_BASE64);
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(OOREDOO_BUSINESS_LOGO_BASE64);
        return;
      }
      
      // Explicitly clear canvas for 100% transparency
      ctx.clearRect(0, 0, width, height);

      const scale = width / 308;
      ctx.save();
      ctx.scale(scale, scale);

      const circleColor = variant === 'white_on_red' ? '#FFFFFF' : '#ED1C24';
      const letterColor = variant === 'white_on_red' ? '#ED1C24' : '#FFFFFF';
      const textColor = variant === 'white_on_red' ? '#FFFFFF' : '#6B7280';

      const centers = [30, 70, 110, 150, 190, 230, 270];
      const letters = ['o', 'o', 'r', 'e', 'd', 'o', 'o'];

      // Draw the 7 circles
      centers.forEach((cx) => {
        ctx.beginPath();
        ctx.arc(cx, 32, 26, 0, Math.PI * 2);
        ctx.fillStyle = circleColor;
        ctx.fill();
      });

      // Draw the letters
      ctx.fillStyle = letterColor;
      ctx.font = "900 30px 'Arial Rounded MT Bold', 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      letters.forEach((letter, i) => {
        ctx.fillText(letter, centers[i], 31);
      });

      // Draw "business" text
      ctx.fillStyle = textColor;
      ctx.font = "800 24px 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('business', 282, 88);

      ctx.restore();

      const pngUrl = canvas.toDataURL('image/png');
      resolve(pngUrl);
    } catch {
      resolve(OOREDOO_BUSINESS_LOGO_BASE64);
    }
  });
};

/**
 * Generates the official 16:9 Ooredoo Business master background image (1920x1080):
 * - Soft radial light-grey gradient (#F2F2F2 center -> #E0E0E0 edges, base #E6E6E6)
 * - Subtle orthogonal grid of white diamonds matching the official template
 */
export const getDiamondMasterBackgroundBase64 = (): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    try {
      const width = 1920;
      const height = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Base fill #E6E6E6 with subtle center radial highlight matching reference slides
      ctx.fillStyle = '#E6E6E6';
      ctx.fillRect(0, 0, width, height);

      const radial = ctx.createRadialGradient(
        width * 0.48,
        height * 0.48,
        width * 0.05,
        width * 0.5,
        height * 0.5,
        width * 0.65
      );
      radial.addColorStop(0, 'rgba(255, 255, 255, 0.52)');
      radial.addColorStop(0.55, 'rgba(240, 240, 240, 0.2)');
      radial.addColorStop(1, 'rgba(205, 205, 205, 0.35)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      // Subtle orthogonal white diamond pattern
      const stepX = 56;
      const stepY = 54;
      const r = 13;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      for (let y = 26; y < height; y += stepY) {
        for (let x = 28; x < width; x += stepX) {
          ctx.beginPath();
          ctx.moveTo(x, y - r);
          ctx.lineTo(x + r, y);
          ctx.lineTo(x, y + r);
          ctx.lineTo(x - r, y);
          ctx.closePath();
          ctx.fill();
        }
      }

      resolve(canvas.toDataURL('image/png'));
    } catch {
      resolve('');
    }
  });
};

/**
 * Generates a transparent PNG overlay of the Ooredoo scalloped red cloud (#ED1C24)
 * and detached right-side red circle for Slide 1 (Page de garde).
 * Sized to map cleanly onto Slide 1 coordinates (x: 0.55, y: 0.55, w: 8.15, h: 4.35).
 */
export const getRedCloudOverlayBase64 = (): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    try {
      // Scale: 160 px per inch => w = 8.15 * 160 = 1304, h = 4.35 * 160 = 696
      const scale = 160;
      const width = Math.round(8.15 * scale);
      const height = Math.round(4.35 * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const RED = '#ED1C24';
      const offsetX = 0.55;
      const offsetY = 0.55;
      const px = (inchX: number) => (inchX - offsetX) * scale;
      const py = (inchY: number) => (inchY - offsetY) * scale;

      ctx.fillStyle = RED;

      // Core cloud body (x: 0.90 -> 7.08, y: 0.95 -> 3.85)
      const bodyX = px(0.90);
      const bodyY = py(0.95);
      const bodyW = (7.08 - 0.90) * scale;
      const bodyH = (3.85 - 0.95) * scale;
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

      const r = 0.225 * scale;
      const drawDot = (ix: number, iy: number, radius = r) => {
        ctx.beginPath();
        ctx.arc(px(ix), py(iy), radius, 0, Math.PI * 2);
        ctx.fill();
      };

      // Top scalloped row (x: 0.85 -> 7.05)
      for (let x = 0.85; x <= 7.08; x += 0.42) {
        drawDot(x, 0.95);
      }

      // Bottom scalloped row (x: 0.85 -> 7.05)
      for (let x = 0.85; x <= 7.08; x += 0.42) {
        drawDot(x, 3.85);
      }

      // Two extra hanging circles bottom-left (as seen in reference Slide 1)
      drawDot(1.27, 4.24);
      drawDot(1.69, 4.24);

      // Left scalloped column (y: 0.95 -> 3.85)
      for (let y = 1.35; y <= 3.55; y += 0.42) {
        drawDot(0.85, y);
      }

      // Right scalloped edge with upper and lower protruding clusters
      for (let y = 1.35; y <= 3.55; y += 0.42) {
        drawDot(7.05, y);
      }
      // Upper-right protrusion
      drawDot(7.45, 1.36);
      drawDot(7.45, 1.77);
      // Lower-right protrusion
      drawDot(7.45, 2.60);
      drawDot(7.45, 3.01);
      drawDot(7.45, 3.43);

      // Detached floating red dot at (x: 8.1, y: 3.3)
      drawDot(8.30, 3.42, 0.23 * scale);

      // Subtle diamond lattice watermark inside the red cloud
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      const dStepX = 56;
      const dStepY = 54;
      const dr = 11;
      for (let y = py(1.0); y < py(3.85); y += dStepY) {
        for (let x = px(0.95); x < px(7.05); x += dStepX) {
          ctx.beginPath();
          ctx.moveTo(x, y - dr);
          ctx.lineTo(x + dr, y);
          ctx.lineTo(x, y + dr);
          ctx.lineTo(x - dr, y);
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    } catch {
      resolve('');
    }
  });
};

/**
 * Generates the exact full-screen 16:9 template background image for Slide 1 (Page de Garde)
 */
export const getCoverSlideTemplateBackgroundBase64 = (): Promise<string> => {
  return getDiamondMasterBackgroundBase64();
};

