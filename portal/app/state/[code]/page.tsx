import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STATE_BY_CODE, STATES } from "@/lib/constants";
import StatePageClient from "./StatePageClient";

interface StatePageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  return STATES.map((s) => ({ code: s.code }));
}

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { code } = await params;
  const stateInfo = STATE_BY_CODE[code.toUpperCase()];
  const name = stateInfo?.name ?? code;
  return {
    title: `${name} Districts`,
    description: `Explore district-level NFHS-5 demographic data for ${name}. Literacy rate, sex ratio, households surveyed, and more.`,
  };
}

export default async function StatePage({ params }: StatePageProps) {
  const { code } = await params;
  const stateCode = code.toUpperCase();
  const stateInfo = STATE_BY_CODE[stateCode];

  if (!stateInfo) {
    notFound();
  }

  return <StatePageClient stateCode={stateCode} />;
}
