export interface Template {
  id: string;
  name: string;
  description: string;
  category: "Starter" | "AI" | "Business" | "Commerce" | "Internal";
  /** Tailwind gradient used for the card art (marketing showcase). */
  gradient: string;
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
      "Full-bleed hero, genre rows, and a title page with episodes and similar picks.",
    category: "Starter",
    gradient: "from-rose-500 to-red-700",
    emoji: "🎬",
    tags: ["Streaming", "Hero", "Rows"],
    prompt:
      "Build a Netflix-style streaming app with a full-bleed hero banner for a featured title, horizontally scrolling content rows grouped by genre, a title detail page with synopsis, cast, episode list, and similar titles, and a search screen with a results grid.",
    popular: true,
  },
  {
    id: "admin-dashboard",
    name: "Build an admin dashboard",
    description:
      "KPI cards with deltas, revenue charts, and a sortable table with a row drawer.",
    category: "Business",
    gradient: "from-blue-600 to-slate-700",
    emoji: "📦",
    tags: ["Charts", "KPIs", "Tables"],
    prompt:
      "Build an admin dashboard with KPI cards showing period-over-period deltas, a revenue line chart and a category breakdown bar chart, a data table with search, column sorting, and pagination, a collapsible sidebar, and a detail drawer for the selected row.",
    popular: true,
  },
  {
    id: "kanban-board",
    name: "Build a kanban board",
    description:
      "Draggable cards across columns, with labels, assignees, and an activity feed.",
    category: "Business",
    gradient: "from-emerald-600 to-teal-700",
    emoji: "📋",
    tags: ["Drag & drop", "Cards", "Columns"],
    prompt:
      "Build a Trello-style kanban board with cards draggable between columns, column creation and renaming, a card detail panel with description, labels, assignee, due date, and a checklist, and a per-board activity feed.",
  },
  {
    id: "file-manager",
    name: "Build a file manager",
    description:
      "Folder tree, grid and list views, upload with progress, and a preview pane.",
    category: "Internal",
    gradient: "from-amber-500 to-yellow-600",
    emoji: "📁",
    tags: ["Folders", "Upload", "Preview"],
    prompt:
      "Build a file manager with a collapsible folder tree, switchable grid and list views, drag-and-drop upload with per-file progress, a preview pane for images and text files, breadcrumb navigation, and rename, move, and delete actions.",
  },
  {
    id: "youtube-clone",
    name: "Build a YouTube clone",
    description:
      "Video grid with category chips, a watch page with comments, and channel tabs.",
    category: "Starter",
    gradient: "from-red-500 to-rose-700",
    emoji: "📺",
    tags: ["Video", "Grid", "Player"],
    prompt:
      "Build a YouTube-style app with a video grid homepage filtered by category chips, a watch page with a player, expandable description, up-next sidebar, and threaded comments, a channel page with videos and about tabs, and a search results list.",
  },
  {
    id: "store-page",
    name: "Build a store page",
    description:
      "Filterable catalog, variant picker, slide-out cart, and multi-step checkout.",
    category: "Commerce",
    gradient: "from-yellow-500 to-amber-600",
    emoji: "🛍️",
    tags: ["Storefront", "Cart", "Checkout"],
    prompt:
      "Build an e-commerce storefront with a product catalog filterable by category and price, product detail pages with an image gallery and size and color variant selection, a slide-out cart with quantity controls and totals, and a multi-step checkout with shipping, payment, and an order summary.",
  },
  {
    id: "airbnb-clone",
    name: "Build an Airbnb clone",
    description:
      "Split map and list view, photo galleries, reviews, and a date-range booking flow.",
    category: "Commerce",
    gradient: "from-pink-500 to-rose-600",
    emoji: "🏠",
    tags: ["Listings", "Map", "Booking"],
    prompt:
      "Build an Airbnb-style app with a listings grid filterable by price, guests, and amenities, a split map and list view, a listing detail page with a photo gallery, amenity list, host card, and reviews, and a booking flow with a date-range picker, guest selector, and price breakdown.",
  },
  {
    id: "spotify-clone",
    name: "Build a Spotify clone",
    description:
      "Playlist sidebar, album track lists, a queue panel, and a sticky player bar.",
    category: "Starter",
    gradient: "from-emerald-500 to-green-700",
    emoji: "🎵",
    tags: ["Playlists", "Player", "Queue"],
    prompt:
      "Build a Spotify-style music player with a playlist sidebar, an album and track list view with hover play controls and durations, a sticky bottom player bar with seek, volume, shuffle, and repeat, a queue panel, and a search view covering songs, albums, and artists.",
  },
  {
    id: "ai-chat-app",
    name: "Build an AI chat app",
    description:
      "Streaming replies, a conversation sidebar, and markdown message rendering.",
    category: "AI",
    gradient: "from-violet-500 to-purple-700",
    emoji: "💬",
    tags: ["Streaming", "Threads", "Markdown"],
    prompt:
      "Build an AI chat app with a conversation sidebar, a message thread with streaming assistant replies, markdown rendering with code blocks, and a prompt input with send and stop controls.",
  },
  {
    id: "image-generator",
    name: "Build an AI image generator",
    description:
      "Prompt input, style presets, and a gallery of generated results.",
    category: "AI",
    gradient: "from-purple-500 to-indigo-700",
    emoji: "🎨",
    tags: ["Prompts", "Gallery", "Presets"],
    prompt:
      "Build an AI image generator with a prompt input, style and aspect-ratio presets, a loading state, and a masonry gallery of generated images with a detail modal.",
  },
  {
    id: "saas-landing",
    name: "Build a SaaS landing page",
    description:
      "Hero, feature grid, pricing tiers, testimonials, and an FAQ section.",
    category: "Starter",
    gradient: "from-sky-500 to-cyan-700",
    emoji: "🚀",
    tags: ["Hero", "Pricing", "FAQ"],
    prompt:
      "Build a marketing landing page for a SaaS product with a hero and call to action, a feature grid, pricing tiers with a highlighted plan, testimonials, an FAQ accordion, and a footer.",
  },
  {
    id: "blog-platform",
    name: "Build a blog platform",
    description:
      "Post list, article reader, tag filtering, and author pages.",
    category: "Starter",
    gradient: "from-orange-500 to-amber-700",
    emoji: "✍️",
    tags: ["Posts", "Tags", "Reader"],
    prompt:
      "Build a blog platform with a paginated post list, an article page with headings and a reading estimate, tag-based filtering, and author profile pages.",
  },
  {
    id: "crm-pipeline",
    name: "Build a CRM pipeline",
    description:
      "Contacts, deal stages, and an activity timeline per account.",
    category: "Business",
    gradient: "from-indigo-500 to-blue-700",
    emoji: "🤝",
    tags: ["Contacts", "Deals", "Timeline"],
    prompt:
      "Build a CRM with a contacts table, a deal pipeline grouped by stage with drag-and-drop, an account detail page with an activity timeline, and a summary of pipeline value.",
  },
  {
    id: "food-ordering",
    name: "Build a food ordering app",
    description:
      "Menu categories, item customization, cart, and order tracking.",
    category: "Commerce",
    gradient: "from-lime-500 to-green-700",
    emoji: "🍔",
    tags: ["Menu", "Cart", "Tracking"],
    prompt:
      "Build a food ordering app with browsable menu categories, item detail with option and add-on customization, a running cart with totals, and an order status tracking screen.",
  },
  {
    id: "helpdesk",
    name: "Build a helpdesk",
    description:
      "Ticket queue with statuses, priorities, replies, and assignment.",
    category: "Internal",
    gradient: "from-teal-500 to-cyan-700",
    emoji: "🎟️",
    tags: ["Tickets", "Queue", "Replies"],
    prompt:
      "Build a support helpdesk with a filterable ticket queue, status and priority badges, a ticket detail view with a threaded reply composer, and assignment to team members.",
  },
  {
    id: "docs-wiki",
    name: "Build a docs wiki",
    description:
      "Sidebar navigation, searchable pages, and in-page table of contents.",
    category: "Internal",
    gradient: "from-slate-500 to-zinc-700",
    emoji: "📚",
    tags: ["Sidebar", "Search", "Contents"],
    prompt:
      "Build a documentation wiki with nested sidebar navigation, article pages rendered from markdown, a search field that filters pages, an in-page table of contents, and previous and next page links.",
  },
];
