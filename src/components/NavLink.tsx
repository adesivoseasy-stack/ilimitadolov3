import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: NavLinkProps["className"] | string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const resolveClassName = (state?: { isActive?: boolean; isPending?: boolean }) =>
      cn(
        typeof className === "function" ? className(state as never) : className,
        state?.isActive && activeClassName,
        state?.isPending && pendingClassName,
      );

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={resolveClassName}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
