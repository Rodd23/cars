import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.js";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
	return (
		<input
			type={type}
			className={cn(
				"w-full h-11 rounded-lg border border-input bg-surface px-3 text-base text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150 hover:border-ink-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring aria-invalid:border-danger disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}
