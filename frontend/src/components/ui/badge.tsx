import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.js";

export const badgeVariants = cva("inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium", {
	variants: {
		variant: {
			default: "bg-muted-strong text-ink-muted",
			soft: "bg-primary-soft text-primary-soft-ink",
		},
	},
	defaultVariants: { variant: "default" },
});

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
	return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
