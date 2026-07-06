import type { ElementType } from "react";

export interface NavItemChild {
  title: string;
  href: string;
  icon: ElementType;
}

export interface NavItem {
  title: string;
  /** Present for plain links; absent for accordion groups */
  href?: string;
  icon: ElementType;
  /** Accordion sub-menu items */
  children?: NavItemChild[];
}
