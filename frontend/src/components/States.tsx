import type { ReactNode } from "react";
import styles from "./States.module.css";

export function Loading({ label = "Carregando..." }: { label?: string }) {
	return (
		<div className={styles.box} role="status" aria-busy="true">
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
		<div className={styles.box} {...(alert ? { role: "alert" } : {})}>
			<h2 className={styles.title}>{title}</h2>
			{children ? <p>{children}</p> : null}
			{action ? <div className={styles.action}>{action}</div> : null}
		</div>
	);
}

export function ErrorMessage({ onRetry }: { onRetry: () => void }) {
	return (
		<Message
			alert
			title="Não foi possível carregar os dados"
			action={
				<button type="button" className="button" onClick={onRetry}>
					Tentar novamente
				</button>
			}
		>
			Ocorreu um problema ao se comunicar com o servidor. Tente novamente em instantes.
		</Message>
	);
}
