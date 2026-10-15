/**
 * A setting from the environment under its `BIGA_` name, then under the
 * `SPIRE_` name it had before the rename, so a deployment that still sets the
 * old one keeps working.
 */
export function envString(name: string): string | undefined {
  return process.env[`BIGA_${name}`] ?? process.env[`SPIRE_${name}`];
}

/** `envString` as a number; unset, zero or not a number falls through to `fallback`. */
export function envNumber(name: string, fallback: number): number {
  return Number(envString(name)) || fallback;
}
