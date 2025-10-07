import { Suspense } from "react";

import TwelveWeekGoalsLoader from "./TwelveWeekGoalsLoader";
import TwelveWeekGoalsRedirector from './TwelveWeekGoalsRedirector';
import TwelveWeekGoalsSkeleton from '@/components/ui/skeleton/TwelveWeekGoalsSkeleton';

export const metadata = {
  title: "12 Week Quests | Better Planner",
  description: "12 Week Quests untuk aplikasi Better Planner",
};

export default function Page() {
  return  (
    <>
      <Suspense fallback={null}>
        <TwelveWeekGoalsRedirector />
      </Suspense>
      <div className="max-w-none w-full">
        <Suspense fallback={<TwelveWeekGoalsSkeleton />}>
          <TwelveWeekGoalsLoader />
        </Suspense>
      </div>
    </>
  );
} 