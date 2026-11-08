import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Button } from "./ui/button.js";

const BOX = "rounded-xl border bg-surface px-4 py-8 text-center text-sm text-ink-subtle";

export function Loading({ label = "Carregando…" }: { label?: string }) {
	return (
		<div className={cn(BOX, "border-line")} role="status" aria-busy="true">
			{label}
		</div>
	);
}

export function Message({
	title,
	children,
	action,
	alert = false,
}: {
	title: string;
	children?: ReactNode;
	action?: ReactNode;
	alert?: boolean;
}) {
	return (
		<div
			className={cn(BOX, alert ? "border-danger" : "border-line")}
			data-state={alert ? "danger" : undefined}
			{...(alert ? { role: "alert" } : {})}
		>
			<h2 className={cn("mb-2 text-xl font-semibold leading-snug tracking-tight", alert ? "text-danger" : "text-ink")}>
				{title}
			</h2>
			{children ? <p className="mx-auto max-w-[48ch] text-pretty">{children}</p> : null}
			{action ? <div className="mt-4 flex justify-center">{action}</div> : null}
		</div>
	);
}

export function ErrorMessage({ onRetry }: { onRetry: () => void }) {
	return (
		<Message
			alert
			title="Não foi possível carregar os dados"
			action={<Button onClick={onRetry}>Tentar novamente</Button>}
		>
			Ocorreu um problema ao se comunicar com o servidor. Verifique sua conexão e tente novamente.
		</Message>
	);
}
