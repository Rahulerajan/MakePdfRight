import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const svgPath = path.join(publicDir, 'favicon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 2. Favicon PNG (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // 3. Favicon ICO (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // 4. Open Graph Image (1200x630)
  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="100%" stop-color="#1E293B" />
      </linearGradient>
      <linearGradient id="redGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#E5322D" />
        <stop offset="100%" stop-color="#C92824" />
      </linearGradient>
    </defs>
    
    <!-- Dark Background -->
    <rect width="1200" height="630" fill="url(#bg)" />

    <!-- Ambient Red Glow -->
    <circle cx="200" cy="150" r="300" fill="#E5322D" opacity="0.08" filter="blur(60px)" />
    
    <!-- Center Content Box -->
    <g transform="translate(100, 120)">
      <!-- Icon -->
      <rect width="100" height="100" rx="28" fill="url(#redGlow)" />
      <path d="M30 22C30 18.6863 32.6863 16 36 16H58L72 30V78C72 81.3137 69.3137 84 66 84H36C32.6863 84 30 81.3137 30 78V22Z" fill="#FFFFFF" />
      <rect x="38" y="42" width="24" height="5" rx="2.5" fill="#E5322D" />
      <rect x="38" y="52" width="24" height="5" rx="2.5" fill="#E5322D" />
      <rect x="38" y="62" width="16" height="5" rx="2.5" fill="#E5322D" />

      <!-- Title -->
      <text x="130" y="62" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="54" fill="#FFFFFF" letter-spacing="-1">MakePDF<tspan fill="#E5322D">Right</tspan></text>
      <text x="130" y="94" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="22" fill="#94A3B8">Fast, Private &amp; Powerful Online PDF &amp; AI Tools</text>
    </g>

    <!-- Tool Chips Grid -->
    <g transform="translate(100, 310)">
      <!-- Card 1 -->
      <rect x="0" y="0" width="220" height="70" rx="16" fill="#1E293B" stroke="#334155" stroke-width="2" />
      <text x="24" y="42" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#F8FAFC">⚡ Merge &amp; Split</text>

      <!-- Card 2 -->
      <rect x="240" y="0" width="220" height="70" rx="16" fill="#1E293B" stroke="#334155" stroke-width="2" />
      <text x="264" y="42" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#F8FAFC">🗜️ Compress PDF</text>

      <!-- Card 3 -->
      <rect x="480" y="0" width="220" height="70" rx="16" fill="#1E293B" stroke="#334155" stroke-width="2" />
      <text x="504" y="42" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#F8FAFC">📄 PDF to Word</text>

      <!-- Card 4 -->
      <rect x="720" y="0" width="260" height="70" rx="16" fill="#1E293B" stroke="#334155" stroke-width="2" />
      <text x="744" y="42" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" fill="#F8FAFC">✨ AI Transcription</text>
    </g>

    <!-- Security Footer -->
    <g transform="translate(100, 480)">
      <rect x="0" y="0" width="1000" height="60" rx="16" fill="#020617" opacity="0.6" stroke="#1E293B" stroke-width="1.5" />
      <text x="30" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" fill="#10B981">🔒 In-Browser &amp; Ephemeral Processing — Automatic 15-Minute Cleanup</text>
    </g>
  </svg>
  `;

  await sharp(Buffer.from(ogSvg))
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('Successfully generated public assets: favicon.ico, apple-touch-icon.png, favicon.png, og-image.png');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
