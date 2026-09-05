import { siteOpenGraph } from "../lib/site-metadata";
import type { Metadata } from "next";
import Home from "../components/Home";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...siteOpenGraph, url: "/" },
};

export default Home;
