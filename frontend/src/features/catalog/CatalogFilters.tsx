import { useEffect, useState, type FormEvent } from "react";
import type { Filters } from "./useCatalogQuery.js";
import styles from "./CatalogFilters.module.css";

type Props = {
	filters: Filters;
	loading: boolean;
	onSearch: (filters: Filters) => void;
	onClear: () => void;
};

export function CatalogFilters({ filters, loading, onSearch, onClear }: Props) {
	const [values, setValues] = useState<Filters>(filters);
	useEffect(() => setValues(filters), [filters]);

	const set = (key: keyof Filters) => (e: { target: { value: string } }) =>
		setValues((v) => ({ ...v, [key]: e.target.value }));

	function submit(e: FormEvent) {
		e.preventDefault();
		onSearch({ brand: values.brand.trim(), model: values.model.trim(), version: values.version.trim() });
	}

	return (
		<form className={styles.form} onSubmit={submit} aria-label="Filtros do catálogo">
			<div className={styles.field}>
				<label htmlFor="filter-brand">Marca</label>
				<input id="filter-brand" name="brand" type="text" value={values.brand} onChange={set("brand")} />
			</div>
			<div className={styles.field}>
				<label htmlFor="filter-model">Modelo</label>
				<input id="filter-model" name="model" type="text" value={values.model} onChange={set("model")} />
			</div>
			<div className={styles.field}>
				<label htmlFor="filter-version">Versão</label>
				<input id="filter-version" name="version" type="text" value={values.version} onChange={set("version")} />
			</div>
			<div className={styles.actions}>
				<button type="submit" className="button" disabled={loading}>
					Buscar
				</button>
				<button type="button" className="button buttonSecondary" onClick={onClear}>
					Limpar
				</button>
			</div>
		</form>
	);
}
