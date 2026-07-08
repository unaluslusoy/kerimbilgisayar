import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Erişilebilir breadcrumb bileşeni.
 * - <nav aria-label="breadcrumb"> ile ekran okuyucular için işaretlenir
 * - Ayırıcılar aria-hidden="true" ile gizlenir
 * - Mevcut sayfa aria-current="page" ile belirtilir
 */
export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className={`text-sm text-gray-500 flex items-center gap-1.5 flex-wrap font-medium ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight
                className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                aria-hidden="true"
              />
            )}
            {isLast || !item.href ? (
              <span
                className={isLast ? 'text-gray-900' : 'text-gray-500'}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
