// ToDontList Types
// Types specific to ToDontList functionality

export interface Rule {
  id: string;
  rule_text: string;
  display_order: number;
}

export interface ToDontListCardProps {
  year: number;
  quarter: number;
  weekNumber: number;
  rules: Rule[];
  loading: boolean;
  onRefresh: () => void;
}
