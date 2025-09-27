import { getPopular, getTrendingMovies, getTrendingTV } from "@/lib/tmdb";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const movies = await getTrendingMovies();
  const tv = await getTrendingTV();

  // 2. Get your base url (e.g., from .env or a fallback)
  const baseUrl = process.env.SITE_URL || "https://rotten-brains.com";

  // 3. Build the XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 
                      http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
>
  ${movies.results
    .map((media: any) => {
      return `
    <url>
      <loc>${baseUrl}/protected/watch/movie/${media.id}</loc>
      <priority>0.80</priority>
      <changefreq>daily</changefreq>
    </url>`;
    })
    .join("")}
      ${tv.results
        .map((media: any) => {
          return `
    <url>
      <loc>${baseUrl}/protected/watch/tv/${media.id}/1/1</loc>
      <priority>0.80</priority>
      <changefreq>daily</changefreq>
    </url>`;
        })
        .join("")}
</urlset>`;

  // 4. Return the response with correct headers
  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
