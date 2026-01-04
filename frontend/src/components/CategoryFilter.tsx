import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Category } from '@/types/article';
import {
  Globe,
  Cpu,
  Code,
  FlaskConical,
  Briefcase,
  MapPin,
  Heart,
  Trophy,
  Gamepad2,
  Film,
  Laugh,
  Landmark,
  Newspaper,
  Lightbulb,
  Palette,
  ChevronDown,
} from 'lucide-react';

interface CategoryFilterProps {
  activeCategories: Category[];
  onToggle: (category: Category) => void;
}

interface CategoryItem {
  value: Category;
  label: string;
  icon: typeof Globe;
}

interface CategoryGroup {
  name: string;
  icon: typeof Globe;
  categories: CategoryItem[];
}

const categoryGroups: CategoryGroup[] = [
  {
    name: 'News',
    icon: Newspaper,
    categories: [
      { value: 'world', label: 'World', icon: Globe },
      { value: 'politics', label: 'Politics', icon: Landmark },
      { value: 'local', label: 'Local', icon: MapPin },
    ],
  },
  {
    name: 'Tech',
    icon: Cpu,
    categories: [
      { value: 'tech', label: 'Tech', icon: Cpu },
      { value: 'programming', label: 'Programming', icon: Code },
      { value: 'gaming', label: 'Gaming', icon: Gamepad2 },
    ],
  },
  {
    name: 'Knowledge',
    icon: Lightbulb,
    categories: [
      { value: 'science', label: 'Science', icon: FlaskConical },
      { value: 'health', label: 'Health', icon: Heart },
    ],
  },
  {
    name: 'Business',
    icon: Briefcase,
    categories: [{ value: 'business', label: 'Business', icon: Briefcase }],
  },
  {
    name: 'Culture',
    icon: Palette,
    categories: [
      { value: 'entertainment', label: 'Entertainment', icon: Film },
      { value: 'humor', label: 'Humor', icon: Laugh },
      { value: 'sports', label: 'Sports', icon: Trophy },
    ],
  },
];

export function CategoryFilter({ activeCategories, onToggle }: CategoryFilterProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (group: CategoryGroup) => {
    const isExpanded = expandedGroups.has(group.name);

    // If clicking the same group that's expanded, collapse and deselect
    if (isExpanded) {
      setExpandedGroups(new Set());
      // Turn off all categories in this group
      for (const cat of group.categories) {
        if (activeCategories.includes(cat.value)) {
          onToggle(cat.value);
        }
      }
      return;
    }

    // Deselect all categories from any currently expanded groups
    for (const expandedName of expandedGroups) {
      const expandedGroup = categoryGroups.find((g) => g.name === expandedName);
      if (expandedGroup) {
        for (const cat of expandedGroup.categories) {
          if (activeCategories.includes(cat.value)) {
            onToggle(cat.value);
          }
        }
      }
    }

    // Also deselect any single-category groups that are active
    for (const otherGroup of categoryGroups) {
      if (otherGroup.categories.length === 1 && otherGroup.name !== group.name) {
        const cat = otherGroup.categories[0];
        if (activeCategories.includes(cat.value)) {
          onToggle(cat.value);
        }
      }
    }

    // Expand only this group
    setExpandedGroups(new Set([group.name]));

    // Select all categories in this group
    for (const cat of group.categories) {
      if (!activeCategories.includes(cat.value)) {
        onToggle(cat.value);
      }
    }
  };

  const isGroupActive = (group: CategoryGroup) => {
    if (activeCategories.length === 0) return true;
    return group.categories.some((c) => activeCategories.includes(c.value));
  };

  const isCategoryActive = (category: Category) => {
    return activeCategories.length === 0 || activeCategories.includes(category);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {categoryGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.name);
          const isActive = isGroupActive(group);
          const Icon = group.icon;
          const isSingleCategory = group.categories.length === 1;

          // Single category groups just toggle that category directly
          if (isSingleCategory) {
            const category = group.categories[0];
            const categoryActive = isCategoryActive(category.value);

            const handleSingleCategoryClick = () => {
              // Collapse and deselect any expanded groups first
              for (const expandedName of expandedGroups) {
                const expandedGroup = categoryGroups.find((g) => g.name === expandedName);
                if (expandedGroup) {
                  for (const cat of expandedGroup.categories) {
                    if (activeCategories.includes(cat.value)) {
                      onToggle(cat.value);
                    }
                  }
                }
              }
              setExpandedGroups(new Set());

              // Toggle this category
              onToggle(category.value);
            };

            return (
              <button
                key={group.name}
                onClick={handleSingleCategoryClick}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                  'border font-display',
                  categoryActive
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{group.name}</span>
              </button>
            );
          }

          return (
            <button
              key={group.name}
              onClick={() => toggleGroup(group)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                'border font-display',
                isActive
                  ? 'bg-primary/10 border-primary/50 text-primary'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{group.name}</span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  isExpanded ? 'rotate-180' : ''
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Expanded categories */}
      {categoryGroups.map((group) => {
        if (!expandedGroups.has(group.name)) return null;

        const selectSingleCategory = (selectedValue: Category) => {
          // Enable selected, disable others in this group
          for (const cat of group.categories) {
            const isCurrentlyActive = activeCategories.includes(cat.value);
            if (cat.value === selectedValue && !isCurrentlyActive) {
              onToggle(cat.value); // Turn on
            } else if (cat.value !== selectedValue && isCurrentlyActive) {
              onToggle(cat.value); // Turn off
            }
          }
        };

        return (
          <div key={`${group.name}-expanded`} className="flex flex-wrap gap-2 pl-2">
            {group.categories.map(({ value, label, icon: Icon }) => {
              const isActive = isCategoryActive(value);
              return (
                <button
                  key={value}
                  onClick={() => selectSingleCategory(value)}
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
      })}
    </div>
  );
}
