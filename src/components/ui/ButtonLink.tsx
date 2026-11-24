import Link, { type LinkProps } from "next/link";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./Button";

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function ButtonLink({ variant = "primary", size = "md", className, leftIcon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {leftIcon}
      {children}
    </Link>
  );
}
