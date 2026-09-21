import MultiverseFlight from "./components/MultiverseFlight";

// A plain import, not next/dynamic. The flight stays server-rendered so the
// page has real content without JS, and it is already split per route: a
// Client Component imported by this page only ships with "/", so no other
// route pays for its weight. Wrapping it in next/dynamic from this Server
// Component bought no splitting — Next does not code-split a Client Component
// dynamically imported from a Server Component — and cost a lazy server-side
// module load that Turbopack's hot reload keeps leaving without its factory,
// which is what breaks dev's `instant` validation for "/" ("Could not
// validate `instant` because an error prevented the target segment from
// rendering"). Please keep this a static import.
export default function Home() {
  return <MultiverseFlight />;
}
