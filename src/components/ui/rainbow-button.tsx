import React from "react";
import { cn } from "@/lib/utils";

interface RainbowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div className="relative group">
        <div
          className="absolute -inset-[2px] rounded-xl opacity-70 group-hover:opacity-100 blur-sm transition-opacity duration-500"
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899, #f43f5e, #6366f1)',
            backgroundSize: '300% 100%',
            animation: 'rainbow 4s linear infinite',
          }}
        />
        <button
          ref={ref}
          className={cn(
            "relative w-full h-11 rounded-xl font-medium text-white transition-all duration-200",
            "bg-background hover:bg-background/90",
            "disabled:opacity-50 disabled:pointer-events-none",
            className
          )}
          {...props}
        >
          {children}
        </button>
        <style>{`
          @keyframes rainbow {
            0% { background-position: 0% 50%; }
            100% { background-position: 300% 50%; }
          }
        `}</style>
      </div>
    );
  }
);

RainbowButton.displayName = "RainbowButton";
