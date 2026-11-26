import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { navigate, routeName } from "../router";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname: string };
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

/** `next/link` replacement for the standalone build. */
export default function Link({ href, onClick, children, prefetch, replace, scroll, ...rest }: LinkProps) {
  void prefetch;
  void replace;
  void scroll;
  const path = typeof href === "string" ? href : href.pathname;
  return (
    <a
      {...rest}
      href={`#${routeName(path)}`}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(path);
      }}
    >
      {children}
    </a>
  );
}
