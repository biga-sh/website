/**
 * Reads a numeric setting from the environment under its `BIGA_` name, then
 * under the `SPIRE_` name it had before the rename, so a deployment that
 * still sets the old one keeps working. Anything unset, zero or not a number
 * falls through to `fallback`.
 */
export function envNumber(name: string, fallback: number): number {
    const value = Number(process.env[`BIGA_${name}`] ?? process.env[`SPIRE_${name}`]);
    return value || fallback;
}
