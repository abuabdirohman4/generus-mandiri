import type { Metadata } from "next";

import VisionForm from './VisionForm';

export const metadata: Metadata = {
  title: "Vision | Better Planner",
  description: "Vision untuk aplikasi Better Planner",
};

export default function VisionPage() {
  return <VisionForm />;
} 