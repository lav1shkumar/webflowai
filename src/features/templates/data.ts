export interface Template {
  id: string;
  name: string;
  description: string;
  category: "Starter" | "AI" | "Business" | "Commerce" | "Internal";
  /** Tailwind gradient used for the card art (marketing showcase). */
  gradient: string;
  icon: string; // lucide icon name (fallback / marketing)
  /** Emoji shown on the app template cards. */
  emoji: string;
  tags: string[];
  /** Seed prompt fed to the generation pipeline. */
  prompt: string;
  popular?: boolean;
}

export const templates: Template[] = [
  {
    id: "netflix-clone",
    name: "Build a Netflix clone",
    description:
      "A streaming homepage with hero banner, content rows, and a video detail page.",
    category: "Starter",
    gradient: "from-rose-500 to-red-700",
    icon: "LayoutTemplate",
    emoji: "🎬",
    tags: ["Streaming", "Hero", "Rows"],
    prompt:
      "Build a Netflix-style streaming homepage with a hero banner, horizontally scrolling content rows, and a video detail page.",
    popular: true,
  },
  {
    id: "admin-dashboard",
    name: "Build an admin dashboard",
    description:
      "Charts, KPIs, and data tables with filtering and a clean sidebar layout.",
    category: "Business",
    gradient: "from-blue-600 to-slate-700",
    icon: "BarChart3",
    emoji: "📦",
    tags: ["Charts", "KPIs", "Tables"],
    prompt:
      "Build an admin dashboard with KPI cards, charts, filterable data tables, and a sidebar navigation.",
    popular: true,
  },
  {
    id: "kanban-board",
    name: "Build a kanban board",
    description:
      "Drag-and-drop columns, cards, labels, and activity — a Trello-style board.",
    category: "Business",
    gradient: "from-emerald-600 to-teal-700",
    icon: "Users",
    emoji: "📋",
    tags: ["Drag & drop", "Cards", "Columns"],
    prompt:
      "Build a Trello-style kanban board with draggable cards, multiple columns, labels, and an activity feed.",
  },
  {
    id: "file-manager",
    name: "Build a file manager",
    description:
      "Folders, file grid, upload, and preview with breadcrumb navigation.",
    category: "Internal",
    gradient: "from-amber-500 to-yellow-600",
    icon: "Wrench",
    emoji: "📁",
    tags: ["Folders", "Upload", "Preview"],
    prompt:
      "Build a file manager with a folder tree, file grid, drag-and-drop upload, preview pane, and breadcrumb navigation.",
  },
  {
    id: "youtube-clone",
    name: "Build a YouTube clone",
    description:
      "A video grid homepage, watch page with player, and a channel layout.",
    category: "Starter",
    gradient: "from-red-500 to-rose-700",
    icon: "LayoutTemplate",
    emoji: "📺",
    tags: ["Video", "Grid", "Player"],
    prompt:
      "Build a YouTube-style app with a video grid homepage, a watch page with a player and comments, and a channel layout.",
  },
  {
    id: "store-page",
    name: "Build a store page",
    description:
      "Product catalog, cart, and checkout with product detail pages.",
    category: "Commerce",
    gradient: "from-yellow-500 to-amber-600",
    icon: "ShoppingBag",
    emoji: "🛍️",
    tags: ["Storefront", "Cart", "Checkout"],
    prompt:
      "Build an e-commerce store page with a product catalog, product detail pages, a shopping cart, and a checkout flow.",
  },
  {
    id: "airbnb-clone",
    name: "Build an Airbnb clone",
    description:
      "Listing grid, map view, detail pages, and a booking flow with dates.",
    category: "Commerce",
    gradient: "from-pink-500 to-rose-600",
    icon: "LayoutTemplate",
    emoji: "🏠",
    tags: ["Listings", "Map", "Booking"],
    prompt:
      "Build an Airbnb-style app with a listings grid, a map view, listing detail pages, and a date-based booking flow.",
  },
  {
    id: "spotify-clone",
    name: "Build a Spotify clone",
    description:
      "Sidebar playlists, a main track view, and a sticky player bar.",
    category: "AI",
    gradient: "from-emerald-500 to-green-700",
    icon: "Sparkles",
    emoji: "🎵",
    tags: ["Playlists", "Player", "Sidebar"],
    prompt:
      "Build a Spotify-style music player with a sidebar for playlists, a main view for songs and details, and a sticky bottom player bar.",
  },
];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}
