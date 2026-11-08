import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.js";

export function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
	return (
		<ToggleGroupPrimitive.Root
			className={cn("inline-flex p-1 gap-1 rounded-lg bg-muted border border-line", className)}
			{...props}
		/>
	);
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
	return (
		<ToggleGroupPrimitive.Item
			className={cn(
				"inline-flex items-center justify-center gap-1.5 h-8 pointer-coarse:h-11 px-3 rounded-md text-[13px] font-medium text-ink-subtle cursor-pointer transition-colors duration-150 hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.12)]",
				className,
			)}
			{...props}
		/>
	);
}
