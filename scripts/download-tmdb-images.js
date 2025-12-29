/**
 * Script to download TMDB images for offline development
 * Run with: node scripts/download-tmdb-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'mock-images');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Download a single image
function downloadImage(imagePath, size = 'w500') {
  return new Promise((resolve, reject) => {
    if (!imagePath) {
      resolve(null);
      return;
    }

    const filename = imagePath.replace('/', '');
    const localPath = path.join(OUTPUT_DIR, filename);

    // Skip if already downloaded
    if (fs.existsSync(localPath)) {
      resolve(filename);
      return;
    }

    const url = `${TMDB_IMAGE_BASE}/${size}${imagePath}`;

    const file = fs.createWriteStream(localPath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filename);
        });
      } else {
        file.close();
        fs.unlink(localPath, () => {});
        resolve(null);
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(localPath, () => {});
      resolve(null);
    });
  });
}

async function downloadAllImages() {
  console.log('Loading mock data...\n');

  // Load the mock data files
  const moviesPath = path.join(__dirname, '..', 'lib', 'mocks', 'tmdb', 'movies.ts');
  const tvPath = path.join(__dirname, '..', 'lib', 'mocks', 'tmdb', 'tv-shows.ts');
  const peoplePath = path.join(__dirname, '..', 'lib', 'mocks', 'tmdb', 'people.ts');

  const moviesContent = fs.readFileSync(moviesPath, 'utf8');
  const tvContent = fs.readFileSync(tvPath, 'utf8');
  const peopleContent = fs.readFileSync(peoplePath, 'utf8');

  // Extract image paths using regex
  const posterRegex = /poster_path["']?\s*:\s*["']([^"']+)["']/g;
  const backdropRegex = /backdrop_path["']?\s*:\s*["']([^"']+)["']/g;
  const profileRegex = /profile_path["']?\s*:\s*["']([^"']+)["']/g;
  const stillRegex = /still_path["']?\s*:\s*["']([^"']+)["']/g;
  const filePathRegex = /file_path["']?\s*:\s*["']([^"']+)["']/g;
  const logoRegex = /logo_path["']?\s*:\s*["']([^"']+)["']/g;

  const allContent = moviesContent + tvContent + peopleContent;

  const posters = new Set();
  const backdrops = new Set();
  const profiles = new Set();
  const logos = new Set();

  let match;
  while ((match = posterRegex.exec(allContent)) !== null) {
    if (match[1] && match[1].startsWith('/')) posters.add(match[1]);
  }
  while ((match = backdropRegex.exec(allContent)) !== null) {
    if (match[1] && match[1].startsWith('/')) backdrops.add(match[1]);
  }
  while ((match = profileRegex.exec(allContent)) !== null) {
    if (match[1] && match[1].startsWith('/')) profiles.add(match[1]);
  }
  while ((match = stillRegex.exec(allContent)) !== null) {
    if (match[1] && match[1].startsWith('/')) backdrops.add(match[1]);
  }
  // file_path is used in images arrays (backdrops, posters, stills)
  while ((match = filePathRegex.exec(allContent)) !== null) {
    if (match[1] && match[1].startsWith('/')) backdrops.add(match[1]);
  }
  // logo_path is used for production company logos
  while ((match = logoRegex.exec(allContent)) !== null) {
    if (match[1] && match[1].startsWith('/')) logos.add(match[1]);
  }

  console.log(`Found ${posters.size} posters, ${backdrops.size} backdrops, ${profiles.size} profiles, ${logos.size} logos\n`);

  // Download posters (w500)
  console.log('Downloading posters...');
  let count = 0;
  for (const poster of posters) {
    await downloadImage(poster, 'w500');
    count++;
    process.stdout.write(`\r  ${count}/${posters.size}`);
  }
  console.log(' Done!\n');

  // Download backdrops (w1280)
  console.log('Downloading backdrops...');
  count = 0;
  for (const backdrop of backdrops) {
    await downloadImage(backdrop, 'w1280');
    count++;
    process.stdout.write(`\r  ${count}/${backdrops.size}`);
  }
  console.log(' Done!\n');

  // Download profiles (w185)
  console.log('Downloading profile images...');
  count = 0;
  for (const profile of profiles) {
    await downloadImage(profile, 'w185');
    count++;
    process.stdout.write(`\r  ${count}/${profiles.size}`);
  }
  console.log(' Done!\n');

  // Download logos (w500)
  console.log('Downloading logos...');
  count = 0;
  for (const logo of logos) {
    await downloadImage(logo, 'w500');
    count++;
    process.stdout.write(`\r  ${count}/${logos.size}`);
  }
  console.log(' Done!\n');

  // Count total files
  const files = fs.readdirSync(OUTPUT_DIR);
  const totalSize = files.reduce((acc, file) => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, file));
    return acc + stats.size;
  }, 0);

  console.log(`\nDownloaded ${files.length} images (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`Saved to: ${OUTPUT_DIR}`);
}

downloadAllImages().catch(console.error);
