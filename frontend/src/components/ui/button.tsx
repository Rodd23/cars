import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.js";

export const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap select-none cursor-pointer transition-[background-color,border-color,color,box-shadow] duration-150 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:pointer-events-none",
	{
		variants: {
			variant: {
				default: "bg-primary text-on-primary hover:bg-primary-hover",
				outline: "bg-surface text-ink border border-input hover:bg-muted",
				ghost: "text-ink-subtle hover:text-ink hover:bg-muted",
			},
			size: {
				default: "h-10 px-4 pointer-coarse:h-11",
				sm: "h-9 px-3 pointer-coarse:h-11",
				icon: "size-10 px-0 pointer-coarse:size-11",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
	return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
