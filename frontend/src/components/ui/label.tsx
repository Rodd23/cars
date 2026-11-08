import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.js";

export function Label({ className, ...props }: ComponentProps<"label">) {
	return <label className={cn("block text-[13px] font-medium text-ink-subtle mb-1.5", className)} {...props} />;
}
