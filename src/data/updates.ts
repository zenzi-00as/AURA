/**
 * @fileOverview Aura Local Update Data Node.
 * Strictly frontend-based to ensure backend isolation.
 */

export type UpdateCategory = 'feature' | 'improvement' | 'community' | 'security' | 'maintenance' | 'coming_soon';

export interface UpdateItem {
  id: string;
  category: UpdateCategory;
  title: string;
  summary: string;
  content: string;
  date: string;
  badge?: string;
  featured?: boolean;
}

export const AURA_UPDATES: UpdateItem[] = [
  {
    id: "community-expansion",
    category: "community",
    title: "Aura Community is expanding",
    summary: "New community experiences are being prepared to give Aura members more ways to connect, discover and participate.",
    content: "We are building a more robust community ecosystem. This includes group discussions, local event nodes, and shared discovery experiences. Our goal is to move beyond one-on-one matching and create a true sense of queer belonging in a secure, digital space. Stay tuned as we materialize these nodes over the coming months.",
    date: "2024-10-25",
    badge: "New",
    featured: true
  },
  {
    id: "profile-improvement",
    category: "improvement",
    title: "A smoother Aura experience",
    summary: "We've improved interface responsiveness, animations and overall navigation across the app.",
    content: "Our engineers have recalibrated the interaction nodes across the dashboard and profile stages. You'll notice faster load times for profile cards, smoother zoom-in animations, and a more responsive layout for larger devices. We are committed to a high-fidelity experience that stays out of your way.",
    date: "2024-10-20",
    badge: "Updated"
  },
  {
    id: "privacy-security",
    category: "security",
    title: "Your privacy matters",
    summary: "Continuous improvements are being made to help protect accounts, conversations and personal information.",
    content: "We have upgraded our biometric synchronization protocols. Our Identity Guard now features improved liveness detection to further eliminate bots and impersonators. Additionally, we've hardened our stateless architecture to ensure your messages remain ephemeral and private, anchored in your local device node.",
    date: "2024-10-15"
  },
  {
    id: "exclusive-content",
    category: "coming_soon",
    title: "Exclusive Content — Coming Soon",
    summary: "Creators will soon be able to share paid exclusive content with their Aura community.",
    content: "We are materializing a new creator economy node. Verified creators will be able to post exclusive high-fidelity media for their supporters, providing a sustainable way to share their art and personality within the protected Aura Haven.",
    date: "2024-12-01"
  },
  {
    id: "discovery-requirements",
    category: "coming_soon",
    title: "Discovery Requirements — Coming Soon",
    summary: "Specify discovery preferences based on time, date and place.",
    content: "Enhanced intentionality is on the horizon. You will soon be able to specify exactly when and where you are looking to connect, allowing for highly synchronized discovery results that match your actual real-world availability and meetup plans.",
    date: "2024-12-15"
  },
  {
    id: "meet-place-finder",
    category: "coming_soon",
    title: "Meet Place Finder — Coming Soon",
    summary: "Discover suitable places for meeting safely in the real world.",
    content: "Safety-first meetups are a priority. We are curating a database of LGBTQ+ friendly public venues. From quiet cafes to vibrant social hubs, Aura will help you find the perfect safe-haven for your first high-fidelity connection.",
    date: "2025-01-10"
  },
  {
    id: "aura-shopping",
    category: "coming_soon",
    title: "Aura Shopping — Coming Soon",
    summary: "Explore and purchase products directly through the Aura ecosystem.",
    content: "Community commerce is being integrated. We are building a curated marketplace of products that celebrate our collective identity. Every transaction will be protected by our hardware-locked payment protocols and verified signature verification.",
    date: "2025-02-01"
  }
];
