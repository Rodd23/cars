import { Link } from "react-router";
import type { Car } from "../../api/types.js";
import { CarImage } from "../../components/CarImage.js";
import { carImageAlt, carTitle, formatMileage, formatPrice } from "./format.js";
import styles from "./CarCard.module.css";

export function CarCard({ car, catalogSearch }: { car: Car; catalogSearch: string }) {
	return (
		<li className={styles.card}>
			<CarImage imageUrl={car.imageUrl} alt={carImageAlt(car)} lazy />
			<div className={styles.body}>
				<h2 className={styles.title}>
					<Link to={`/cars/${car.id}`} state={{ catalogSearch }} className={styles.link}>
						{carTitle(car)}
					</Link>
				</h2>
				{car.version ? <p className={styles.version}>{car.version}</p> : null}
				<p className={styles.price}>{formatPrice(car.price)}</p>
				<p className={styles.meta}>
					{car.year} &middot; {formatMileage(car.mileage)}
				</p>
			</div>
		</li>
	);
}
