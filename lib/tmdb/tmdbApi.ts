const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY!;
const BASE_URL = "https://api.themoviedb.org/3";

export const fetchFromApi = async (
  endpoint: string,
  append_to_response?: string,
  cached: boolean = true, // Control cache dynamically
): Promise<any> => {
  let url = `${BASE_URL}/${endpoint}&api_key=${API_KEY}`;

  if (append_to_response) {
    url = `${BASE_URL}/${endpoint}&api_key=${API_KEY}&append_to_response=${append_to_response}`;
  }

  // Set Cache-Control header based on `cached` parameter
  const cacheControl = cached
    ? "max-age=2592000, must-revalidate" // Cache for 30 days if cached is true
    : "no-store"; // Disable caching if cached is false

  try {
    const response = await fetch(url, {
      headers: {
        "Cache-Control": cacheControl,
      },
    });

    if (!response.ok) {
      console.log(`Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Failed to fetch from API: ${endpoint}`, error);
    throw error;
  }
};
