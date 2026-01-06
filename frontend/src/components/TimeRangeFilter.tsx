import { Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TimeRange } from '@minfeed/shared';

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; shortLabel: string }[] = [
  { value: 'today', label: 'Today', shortLabel: 'Today' },
  { value: 'yesterday', label: 'Yesterday', shortLabel: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 days', shortLabel: '7 days' },
  { value: 'last14days', label: 'Last 14 days', shortLabel: '14 days' },
];

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const currentOption = TIME_RANGE_OPTIONS.find((opt) => opt.value === value) || TIME_RANGE_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {currentOption.shortLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {TIME_RANGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={value === option.value ? 'bg-secondary' : ''}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
