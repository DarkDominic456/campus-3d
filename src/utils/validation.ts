/** Tiny form validation helpers. Each rule returns an error message or null. */

export type Rule = (value: string) => string | null

export const required = (label: string): Rule => (v) => (v.trim() ? null : `${label} is required.`)

export const minLength = (label: string, n: number): Rule => (v) =>
  v.trim().length >= n ? null : `${label} must be at least ${n} characters.`

export const maxLength = (label: string, n: number): Rule => (v) =>
  v.trim().length <= n ? null : `${label} must be at most ${n} characters.`

// Deliberately simple: something@something.tld, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const email: Rule = (v) => (EMAIL.test(v.trim()) ? null : 'Enter a valid email address.')

/** Runs every field's rules; returns the first error per field (only failing fields present). */
export function validate<T extends { [K in keyof T]: string }>(
  values: T,
  rules: Partial<Record<keyof T, Rule[]>>,
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {}
  for (const key of Object.keys(rules) as (keyof T)[]) {
    for (const rule of rules[key] ?? []) {
      const error = rule(values[key] ?? '')
      if (error) {
        errors[key] = error
        break
      }
    }
  }
  return errors
}
