import dynamic from "next/dynamic";

// The flight is the entire content of "/" and stays server-rendered (no
// ssr:false) so the page still has real content without JS — but splitting
// it into its own chunk keeps its considerable weight (canvas particles,
// the card portals, motion) out of the shared bundle every other route
// would otherwise have to pay for too. body's own CSS background already
// matches the flight's opening gradient, so there's nothing to flash while
// the chunk loads.
const MultiverseFlight = dynamic(() => import("./components/MultiverseFlight"));

export default function Home() {
  return <MultiverseFlight />;
}

