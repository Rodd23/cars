import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.js";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
	className,
	align = "end",
	sideOffset = 8,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				align={align}
				sideOffset={sideOffset}
				collisionPadding={8}
				className={cn(
					"z-40 w-60 max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface p-1.5 text-ink shadow-pop outline-none",
					className,
				)}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	);
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
	return (
		<DropdownMenuPrimitive.Item
			className={cn(
				"flex w-full cursor-pointer items-center gap-2 h-9 pointer-coarse:h-11 px-2.5 rounded-md text-sm text-ink-muted outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-ink focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-4 [&_svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
	return <DropdownMenuPrimitive.Label className={cn("px-2.5 py-2", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
	return <DropdownMenuPrimitive.Separator className={cn("h-px bg-line my-1", className)} {...props} />;
}
