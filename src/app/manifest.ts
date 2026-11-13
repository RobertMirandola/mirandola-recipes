import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mirandola Recipes",
    short_name: "Recipes",
    description: "My recipes, with ingredients that scale to the number of meals.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#faf6ef",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
