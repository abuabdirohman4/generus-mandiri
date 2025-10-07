"use client";
import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { ChevronLeftIcon, ChevronRightIcon } from "@/lib/icons";
import { 
  getPrevQuarter, 
  getNextQuarter,
  getQuarterString,
  generateQuarterOptions,
  formatQParam
} from "@/lib/quarterUtils";
import { useQuarterStore } from "@/stores/quarterStore";

const QuarterSelector: React.FC = () => {
  const { year, quarter, setQuarter } = useQuarterStore();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const options = useMemo(() => generateQuarterOptions({ year, quarter }), [year, quarter]);

  const updateURL = (newYear: number, newQuarter: number) => {
    const qParam = formatQParam(newYear, newQuarter);
    const currentPath = window.location.pathname;
    const newURL = `${currentPath}?q=${qParam}`;
    router.replace(newURL);
  };

  const handlePrev = () => {
    const prev = getPrevQuarter(year, quarter);
    setQuarter(prev.year, prev.quarter);
    updateURL(prev.year, prev.quarter);
  };
  
  const handleNext = () => {
    const next = getNextQuarter(year, quarter);
    setQuarter(next.year, next.quarter);
    updateURL(next.year, next.quarter);
  };
  
  const handleSelect = (y: number, q: number) => {
    setQuarter(y, q);
    updateURL(y, q);
    setIsOpen(false);
  };

  const handleDropdownToggle = () => {
    setIsOpen((v) => !v);
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handlePrev} aria-label="Sebelumnya">
        <ChevronLeftIcon className="w-5 h-5" />
      </Button>
      <div className="relative">
        <button
          className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg border border-gray-400 bg-white dark:text-white dark:bg-gray-900 cursor-pointer min-w-32 dropdown-toggle hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={handleDropdownToggle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{getQuarterString(year, quarter)}</span>
        </button>
        <Dropdown className="w-32" isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="max-h-64 overflow-y-auto">
            {options.map((opt) => (
              <DropdownItem
                key={`${opt.year}-Q${opt.quarter}`}
                onClick={() => handleSelect(opt.year, opt.quarter)}
                className={
                  opt.year === year && opt.quarter === quarter
                    ? "bg-brand-100 dark:bg-brand-900/30 font-semibold !text-center"
                    : "!text-center"
                }
              >
                {getQuarterString(opt.year, opt.quarter)}
              </DropdownItem>
            ))}
          </div>
        </Dropdown>
      </div>
      <Button size="sm" variant="outline" onClick={handleNext} aria-label="Berikutnya">
        <ChevronRightIcon className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default QuarterSelector; 