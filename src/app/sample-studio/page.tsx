import type { Metadata } from "next";
import { TrackerApp } from "../tracker-app";
import { DataProvider } from "@/lib/data-context";

export const metadata: Metadata = {
  title: "Sample Studio | Relay",
  description: "Explore a populated, read-only Relay production workspace.",
  robots: { index: false, follow: false },
};

export default function SampleStudioPage() {
  return (
    <DataProvider mode="sample">
      <TrackerApp page="dashboard" experienceMode="sample" />
    </DataProvider>
  );
}
