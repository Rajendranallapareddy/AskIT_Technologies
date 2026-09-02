import {
  LucideIcon,
  ChevronRight,
} from 'lucide-react';

import {
  Link,
} from 'react-router-dom';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;

  accent?:
    | 'orange'
    | 'navy'
    | 'green'
    | 'red';

  to?: string;
}

const ACCENTS = {
  orange:
    'bg-orange-50 text-orange-600',

  navy:
    'bg-navy-50 text-navy-700',

  green:
    'bg-green-50 text-green-600',

  red:
    'bg-red-50 text-red-600',
};

export default function StatsCard({
  icon: Icon,
  label,
  value,
  accent = 'navy',
  to,
}: StatsCardProps) {
  const content = (
    <>
      <span
        className={`
          w-11 h-11
          sm:w-12 sm:h-12
          rounded-xl
          flex items-center justify-center
          shrink-0
          ${ACCENTS[accent]}
        `}
      >
        <Icon className="w-5 h-5" />
      </span>

      <div className="flex-1 min-w-0 overflow-hidden">
        <p
          title={String(value)}
          className="
            font-extrabold
            text-navy-900
            leading-tight
            whitespace-nowrap
            overflow-hidden
            text-ellipsis
            text-xl
            xl:text-2xl
          "
        >
          {value}
        </p>

        <p
          title={label}
          className="
            text-xs
            text-navy-500
            font-medium
            mt-1
            leading-tight
            break-words
          "
        >
          {label}
        </p>
      </div>

      {to && (
        <ChevronRight
          className="
            w-4 h-4
            text-navy-300
            shrink-0
          "
        />
      )}
    </>
  );

  const cardClasses = `
    card
    min-w-0
    overflow-hidden
    p-4
    sm:p-5
    flex
    items-center
    gap-3
    sm:gap-4
  `;

  if (to) {
    return (
      <Link
        to={to}
        className={`
          ${cardClasses}
          hover:border-orange-300
          hover:shadow-card-hover
          transition
          group
        `}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cardClasses}>
      {content}
    </div>
  );
}