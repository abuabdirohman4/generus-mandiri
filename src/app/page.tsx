import { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Better Planner - Transform Your Goals Into Achievements",
  description: "The ultimate productivity companion for ambitious individuals. Strategic planning, task management, and goal achievement with cutting-edge technology.",
  keywords: "productivity, planning, task management, goal setting, project management, time tracking",
  openGraph: {
    title: "Better Planner - Transform Your Goals Into Achievements",
    description: "The ultimate productivity companion for ambitious individuals. Strategic planning, task management, and goal achievement with cutting-edge technology.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Better Planner - Transform Your Goals Into Achievements",
    description: "The ultimate productivity companion for ambitious individuals. Strategic planning, task management, and goal achievement with cutting-edge technology.",
  },
};

export default function LandingPage() {
  return <LandingPageClient />;
}
