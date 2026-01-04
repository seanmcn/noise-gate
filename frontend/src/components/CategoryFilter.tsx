import { cn } from '@/lib/utils';
import { Category } from '@/types/article';
import { Globe, Cpu, Code, FlaskConical, Briefcase, MapPin, Heart, Trophy, Gamepad2, Film, Laugh, Landmark } from 'lucide-react';

interface CategoryFilterProps {
  activeCategories: Category[];
  onToggle: (category: Category) => void;
}

const categories: { value: Category; label: string; icon: typeof Globe }[] = [
  { value: 'world', label: 'World', icon: Globe },
  { value: 'tech', label: 'Tech', icon: Cpu },
  { value: 'programming', label: 'Programming', icon: Code },
  { value: 'science', label: 'Science', icon: FlaskConical },
  { value: 'business', label: 'Business', icon: Briefcase },
  { value: 'local', label: 'Local', icon: MapPin },
  { value: 'health', label: 'Health', icon: Heart },
  { value: 'sports', label: 'Sports', icon: Trophy },
  { value: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { value: 'entertainment', label: 'Entertainment', icon: Film },
  { value: 'humor', label: 'Humor', icon: Laugh },
  { value: 'politics', label: 'Politics', icon: Landmark },
];

export function CategoryFilter({ activeCategories, onToggle }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(({ value, label, icon: Icon }) => {
        const isActive = activeCategories.length === 0 || activeCategories.includes(value);
        return (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
              'border font-display',
              isActive
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
