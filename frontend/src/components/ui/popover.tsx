import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.js";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
	className,
	align = "start",
	sideOffset = 8,
	...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				sideOffset={sideOffset}
				collisionPadding={8}
				className={cn(
					"z-40 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface p-4 text-ink shadow-pop outline-none",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}
