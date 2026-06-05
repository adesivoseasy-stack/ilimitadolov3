import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className" | "children"> {
  className?: NavLinkProps["className"] | string;
  children?: NavLinkProps["children"] | React.ReactNode;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, children, activeClassName, pendingClassName, to, ...props }, ref) => {
    const resolveClassName: NavLinkProps["className"] = (state) => {
      const safe = state ?? { isActive: false, isPending: false, isTransitioning: false };
      return cn(
        typeof className === "function" ? className(safe) : className,
        safe.isActive && activeClassName,
        safe.isPending && pendingClassName,
      );
    };

    const childrenProp =
      typeof children === "function"
        ? ((state: any) =>
            (children as any)(state ?? { isActive: false, isPending: false, isTransitioning: false }))
        : children;

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={resolveClassName}
        {...props}
      >
        {childrenProp as any}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
