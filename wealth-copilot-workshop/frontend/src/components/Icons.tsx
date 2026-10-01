// Minimal inline icon set (stroke icons, 24px grid) - no icon dependency.
import type { ReactNode, SVGProps } from 'react'

function Icon({ children, size = 18, ...rest }: SVGProps<SVGSVGElement> & { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

type P = { size?: number }

export const HomeIcon = (p: P) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Icon>
export const TrendIcon = (p: P) => <Icon {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></Icon>
export const ShieldIcon = (p: P) => <Icon {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="M12 8v4" /><path d="M12 16h.01" /></Icon>
export const TargetIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Icon>
export const PieIcon = (p: P) => <Icon {...p}><path d="M21 12A9 9 0 1 1 12 3v9z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15z" /></Icon>
export const BulbIcon = (p: P) => <Icon {...p}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></Icon>
export const SparkIcon = (p: P) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></Icon>
export const InfoIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></Icon>
export const AlertIcon = (p: P) => <Icon {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Icon>
export const CheckIcon = (p: P) => <Icon {...p}><path d="m5 12 5 5 9-10" /></Icon>
export const ArrowIcon = (p: P) => <Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>
export const ChevronIcon = (p: P) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
export const SendIcon = (p: P) => <Icon {...p}><path d="M4 12 20 4l-6 16-3-7z" /></Icon>
export const DataIcon = (p: P) => <Icon {...p}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></Icon>

export function LogoMark({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 18 9.5 8l4 6 2.5-4L20 18" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="6" r="2" fill="#dcedff" />
    </svg>
  )
}
