import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cardGradients, cards } from "../data/sections";
import { SectionContent } from "./SectionContent";

<<<<<<< HEAD
// The resume card downloads a PDF directly instead of opening a details
// page, so it's excluded from the standalone /[section] routes.
const detailSections = cards.filter((card) => card.id !== "resume");
=======
const detailSections = cards;
>>>>>>> 8a13a2e (ccc)

export function generateStaticParams() {
  return detailSections.map((card) => ({ section: card.id }));
}

function findSection(id: string) {
  return detailSections.find((card) => card.id === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const card = findSection(section);
  if (!card) return {};

  return {
    title: `${card.title} | Umar Suhail`,
    description: card.description,
    alternates: { canonical: `/${card.id}` },
    openGraph: {
      title: card.title,
      description: card.description,
      type: "article",
      ...(card.image && { images: [{ url: card.image }] }),
    },
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const card = findSection(section);
  if (!card) notFound();

  const position = detailSections.findIndex((c) => c.id === card.id);
  const gradient = cardGradients[position % cardGradients.length];

  const previous =
    detailSections[(position - 1 + detailSections.length) % detailSections.length];
  const next = detailSections[(position + 1) % detailSections.length];

  return (
    <SectionContent
      card={card}
      gradient={gradient}
      previous={previous}
      next={next}
    />
  );
}