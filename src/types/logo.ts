import type { ComponentType } from "react";

export type LogoProps = { size?: number; name: string };
// ComponentType (not a bare function type) so next/dynamic's return value —
// used to lazy-load each hand-crafted logo, see components/service/logos/index.tsx —
// is assignable here; ComponentType's FunctionComponent call signature returns
// ReactNode, which a bare `=> JSX.Element` signature can't accept.
export type LogoComponent = ComponentType<LogoProps>;
