import type { ComponentType } from "react";

export type LogoProps = { size?: number; name: string };
// ComponentType, not `=> JSX.Element`, so next/dynamic's return value is assignable.
export type LogoComponent = ComponentType<LogoProps>;
