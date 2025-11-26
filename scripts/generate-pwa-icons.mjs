// scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Using the app favicon source (red R on white background)
const SOURCE_LOGO = './public/assets/images/favicon-source.png';
const OUTPUT_DIR = './public/icons';

const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

const APPLE_ICON_SIZE = 180;
const FAVICON_SIZES = [16, 32, 48];

async function generateIcons() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating PWA icons from:', SOURCE_LOGO);

  // Read source image
  const sourceImage = sharp(SOURCE_LOGO);
  const metadata = await sourceImage.metadata();

  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // Generate standard icons with padding for square format
  for (const { size, name } of ICON_SIZES) {
    await sharp(SOURCE_LOGO)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, name));

    console.log(`Generated: ${name}`);
  }

  // Generate maskable icon (with padding for safe zone)
  const maskableSize = 512;
  const safeZoneSize = Math.floor(maskableSize * 0.8); // 80% is safe zone

  await sharp(SOURCE_LOGO)
    .resize(safeZoneSize, safeZoneSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .extend({
      top: Math.floor((maskableSize - safeZoneSize) / 2),
      bottom: Math.ceil((maskableSize - safeZoneSize) / 2),
      left: Math.floor((maskableSize - safeZoneSize) / 2),
      right: Math.ceil((maskableSize - safeZoneSize) / 2),
      background: { r: 15, g: 15, b: 15, alpha: 1 } // Dark background matching theme
    })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'maskable-icon-512x512.png'));

  console.log('Generated: maskable-icon-512x512.png');

  // Generate Apple touch icon
  await sharp(SOURCE_LOGO)
    .resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));

  console.log('Generated: apple-touch-icon.png');

  // Generate favicon.ico (actually just a 32x32 PNG, browser will handle it)
  await sharp(SOURCE_LOGO)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'favicon-32x32.png'));

  console.log('Generated: favicon-32x32.png');

  // Copy a favicon to public root
  await sharp(SOURCE_LOGO)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile('./public/favicon.ico');

  console.log('Generated: public/favicon.ico');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
