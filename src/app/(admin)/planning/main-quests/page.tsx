import type { Metadata } from "next";

import MainQuestsClient from './MainQuestsClient';

export const metadata: Metadata = {
  title: "Main Quests | Better Planner",
  description: "Main Quests untuk aplikasi Better Planner",
};

export default function Page() {
  return <MainQuestsClient />;
}
