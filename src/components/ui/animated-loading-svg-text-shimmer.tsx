import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Loader Component - Animated SVG Path Loader
// ---------------------------------------------------------------------------

let cachedPathLength = 0;
let stylesInjected = false;

const LOADER_KEYFRAMES = `
  @keyframes drawStroke {
    0% {
      stroke-dashoffset: var(--path-length);
      animation-timing-function: ease-in-out;
    }
    50% {
      stroke-dashoffset: 0;
      animation-timing-function: ease-in-out;
    }
    100% {
      stroke-dashoffset: calc(var(--path-length) * -1);
    }
  }
`;

interface LoaderProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

const Loader = React.forwardRef<SVGSVGElement, LoaderProps>(
  ({ className, size = 64, strokeWidth = 2, ...props }, ref) => {
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState<number>(cachedPathLength);

    useEffect(() => {
      if (typeof window !== 'undefined' && !stylesInjected) {
        stylesInjected = true;
        const style = document.createElement('style');
        style.innerHTML = LOADER_KEYFRAMES;
        document.head.appendChild(style);
      }

      if (!cachedPathLength && pathRef.current) {
        cachedPathLength = pathRef.current.getTotalLength();
        setPathLength(cachedPathLength);
      }
    }, []);

    const isReady = pathLength > 0;

    return (
      <svg
        ref={ref}
        role="status"
        aria-label="Loading..."
        viewBox="0 0 19 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className={cn("text-current", className)}
        {...props}
      >
        <path
          ref={pathRef}
          d="M4.43431 2.42415C-0.789139 6.90104 1.21472 15.2022 8.434 15.9242C15.5762 16.6384 18.8649 9.23035 15.9332 4.5183C14.1316 1.62255 8.43695 0.0528911 7.51841 3.33733C6.48107 7.04659 15.2699 15.0195 17.4343 16.9241"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={isReady ? {
            strokeDasharray: pathLength,
            '--path-length': pathLength,
          } as React.CSSProperties : undefined}
          className={cn(
            "transition-opacity duration-300",
            isReady ? "opacity-100 animate-[drawStroke_2.5s_infinite]" : "opacity-0"
          )}
        />
      </svg>
    );
  }
);

Loader.displayName = "Loader";

// ---------------------------------------------------------------------------
// Loading Breadcrumb Component - Animated Loading State with Shimmer Text
// ---------------------------------------------------------------------------

interface LoadingBreadcrumbProps {
  text?: string;
  className?: string;
}

export function LoadingBreadcrumb({ 
  text = "Cooking", 
  className 
}: LoadingBreadcrumbProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <style>{`
        @keyframes textShimmer {
          0% { 
            background-position: -100% center;
          }
          100% { 
            background-position: 100% center;
          }
        }
      `}</style>

      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader size={20} strokeWidth={2} className="text-primary" />
        <ChevronRight className="h-4 w-4 opacity-50" />
        <span
          className="text-sm font-medium bg-clip-text text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(90deg, hsl(var(--muted-foreground)) 40%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground)) 60%)',
            backgroundSize: '200% 100%',
            animation: 'textShimmer 2s infinite linear',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Example Usage
// ---------------------------------------------------------------------------

export default function LoadingBreadcrumbDemo() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingBreadcrumb />
    </div>
  );
}
