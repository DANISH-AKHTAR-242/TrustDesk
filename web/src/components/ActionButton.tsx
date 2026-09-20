// A Button bound to useAction(): shows its spinner while `busy === name` and is disabled while any action runs.
import { Button, type ButtonProps } from './ui/Button.tsx'

export function ActionButton({ name, busy, disabled, ...rest }: ButtonProps & { name: string; busy: string | null }) {
  return <Button loading={busy === name} disabled={disabled || busy !== null} {...rest} />
}
