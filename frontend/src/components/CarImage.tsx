import { useEffect, useState } from "react";
import { cn } from "../lib/cn.js";

type Props = { imageUrl: string | null; alt: string; lazy?: boolean; className?: string | undefined };

// Dimensões de referência 16:10; o CSS define o tamanho real e o recorte.
const WIDTH = 800;
const HEIGHT = 500;

export function CarImage({ imageUrl, alt, lazy = false, className }: Props) {
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [imageUrl]);

	if (!imageUrl || failed) {
		return (
			<div
				className={cn(
					"flex aspect-[16/10] h-auto w-full max-w-full items-center justify-center bg-placeholder text-[13px] text-ink-subtle",
					className,
				)}
				role="img"
				aria-label={alt}
			>
				<span>Sem imagem</span>
			</div>
		);
	}
	return (
		<img
			className={cn("block aspect-[16/10] h-auto w-full max-w-full bg-placeholder object-cover", className)}
			src={imageUrl}
			alt={alt}
			width={WIDTH}
			height={HEIGHT}
			loading={lazy ? "lazy" : "eager"}
			decoding="async"
			onError={() => setFailed(true)}
		/>
	);
}
