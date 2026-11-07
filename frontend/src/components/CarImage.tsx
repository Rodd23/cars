import { useEffect, useState } from "react";
import styles from "./CarImage.module.css";

type Props = { imageUrl: string | null; alt: string; lazy?: boolean };

export function CarImage({ imageUrl, alt, lazy = false }: Props) {
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [imageUrl]);

	if (!imageUrl || failed) {
		return (
			<div className={styles.fallback} role="img" aria-label={alt}>
				<span>Sem imagem</span>
			</div>
		);
	}
	return (
		<img
			className={styles.image}
			src={imageUrl}
			alt={alt}
			{...(lazy ? { loading: "lazy" as const } : {})}
			onError={() => setFailed(true)}
		/>
	);
}
