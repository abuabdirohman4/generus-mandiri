"use client";

import React from "react";
import SideQuestList from "./components/SideQuestList";

export default function SideQuestsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <SideQuestList />
      </div>
    </div>
  );
}
