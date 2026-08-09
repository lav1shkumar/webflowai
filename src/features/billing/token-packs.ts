export const tokenPacks = [
  {
    id: "starter",
    name: "Starter",
    tagline: "A quick top-up for smaller builds.",
    price: 59900,
    tokens: 1000,
    highlight: false,
    features: ["1,000 AI tokens", "One-time purchase", "Tokens never expire"],
  },
  {
    id: "builder",
    name: "Builder",
    tagline: "More room to build and iterate.",
    price: 199900,
    tokens: 5000,
    highlight: true,
    features: ["5,000 AI tokens", "One-time purchase", "Tokens never expire"],
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "The best value for larger projects.",
    price: 299900,
    tokens: 10000,
    highlight: false,
    features: ["10,000 AI tokens", "One-time purchase", "Tokens never expire"],
  },
] as const;

export type TokenPackId = (typeof tokenPacks)[number]["id"];

export function getTokenPack(id: TokenPackId) {
  return tokenPacks.find((pack) => pack.id === id)!;
}
