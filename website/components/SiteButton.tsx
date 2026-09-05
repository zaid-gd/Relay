import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type SiteButtonProps =
  | (ComponentPropsWithoutRef<"a"> & { href: string })
  | (ComponentPropsWithoutRef<"button"> & { href?: never });

export default function SiteButton(props: SiteButtonProps) {
  if (props.href !== undefined) {
    const { className = "", ...linkProps } = props;
    return <Link {...linkProps} className={`specular-button ${className}`} />;
  }

  const { className = "", type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      className={`specular-button ${className}`}
    />
  );
}
