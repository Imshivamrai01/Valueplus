"use client";

import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, subtitle, breadcrumbs, actions, children }: PageShellProps) {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5 text-xs text-muted-foreground">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-[#3F63AD] transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="page-content">{children}</div>
    </div>
  );
}
