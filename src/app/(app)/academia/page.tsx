import type { Metadata } from "next";
import { AcademyView } from "@/features/academy/academy-view";

export const metadata: Metadata = { title: "Academia de velas" };

export default function Page() {
  return <AcademyView />;
}
