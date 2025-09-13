const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'frontend', 'project', 'public');

// Base64 for a simple 144x144 emerald square
const icon144 = `iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAYAAADnRuK4AAAACXBIWXMAAAsTAAALEwEAmpwYAAABgklEQVR4nO3dMQ6CQBRF0fuGxAW4BBfgElyCCxAXYmJi4kJcgkvwJ8ZEjR8Fhpl37pk0FGWa3Os8BowkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZL0l10gIkBJ0gvMAYwBjCRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkqQf9gBgAJ/91RMAAAAASUVORK5CYII=`;

// Create pwa-144x144.png
fs.writeFileSync(
  path.join(publicDir, 'pwa-144x144.png'),
  Buffer.from(icon144, 'base64')
);
console.log('Created pwa-144x144.png');

// Copy existing 192 icon as pwa-192x192.png 
if (fs.existsSync(path.join(publicDir, 'icon-192x192.png'))) {
  fs.copyFileSync(
    path.join(publicDir, 'icon-192x192.png'),
    path.join(publicDir, 'pwa-192x192.png')
  );
  console.log('Created pwa-192x192.png');
}

// Copy existing 512 icon as pwa-512x512.png
if (fs.existsSync(path.join(publicDir, 'icon-512x512.png'))) {
  fs.copyFileSync(
    path.join(publicDir, 'icon-512x512.png'),
    path.join(publicDir, 'pwa-512x512.png')
  );
  console.log('Created pwa-512x512.png');
}

// Create apple-touch-icon.png (180x180)
const appleIcon = `iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAYAAAA9zQYyAAAACXBIWXMAAAsTAAALEwEAmpwYAAABhklEQVR4nO3dMQ7CMBBEUe8RuP8VOAJHgCNwBI5AEYkCCiigwDqz7z+ppKGwNJ5sxyFJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkqQv9gDH1AJ6EKIAAAAASUVORK5CYII=`;

fs.writeFileSync(
  path.join(publicDir, 'apple-touch-icon.png'),
  Buffer.from(appleIcon, 'base64')
);
console.log('Created apple-touch-icon.png');

// Create screenshots directory
const screenshotsDir = path.join(publicDir, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Create placeholder screenshot
const screenshot = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==`;

fs.writeFileSync(
  path.join(screenshotsDir, 'desktop-dashboard.png'),
  Buffer.from(screenshot, 'base64')
);
console.log('Created screenshots/desktop-dashboard.png');

console.log('\nAll missing PWA assets created!');