// This module can only be used on the server (uses sharp)
// For client components, pass the color as a prop from a server component parent

const DEFAULT_COLOR = { hex: '#3b82f6' };

export async function getAverageColorSafe(
  imageUrl: string
): Promise<{ hex: string }> {
  // Only run on server
  if (typeof window !== 'undefined') {
    return DEFAULT_COLOR;
  }

  try {
    // Dynamically import sharp to avoid bundling issues
    const sharp = (await import('sharp')).default;

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log('[getAverageColorSafe] Fetch failed:', imageUrl, response.status);
      return DEFAULT_COLOR;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Resize to 1x1 pixel to get the average color
    const { data } = await sharp(buffer)
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const r = data[0];
    const g = data[1];
    const b = data[2];

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    console.log('[getAverageColorSafe] Success:', imageUrl, hex);
    return { hex };
  } catch (error) {
    console.log('[getAverageColorSafe] Error:', imageUrl, error);
    return DEFAULT_COLOR;
  }
}
