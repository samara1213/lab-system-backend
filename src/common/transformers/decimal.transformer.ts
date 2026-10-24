import { ValueTransformer } from 'typeorm';

/**
 * Postgres devuelve las columnas DECIMAL como texto ('10000.00'). Este
 * transformer las entrega como numero a la aplicacion y al frontend
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : parseFloat(value)),
};
