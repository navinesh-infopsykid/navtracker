import type { MetadataRoute } from "next";

// Lets you "Add to Home Screen" on iPhone/Android so NavTracker opens like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NavTracker",
    short_name: "NavTracker",
    description: "12-week study & career tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#8b5cf6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
