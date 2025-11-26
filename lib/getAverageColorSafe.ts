// Safe wrapper for fast-average-color-node that handles sharp loading failures
const DEFAULT_COLOR = { hex: '#3b82f6' };

export async function getAverageColorSafe(
  imageUrl: string
): Promise<{ hex: string }> {
  try {
    const { getAverageColor } = await import('fast-average-color-node');
    return await getAverageColor(imageUrl);
  } catch {
    // Return fallback color if sharp fails to load
    return DEFAULT_COLOR;
  }
}
