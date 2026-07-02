// แบนเนอร์ onboarding/empty-state ทรง Paper & Pencil ใช้ร่วมกันได้ทั้ง server และ client component
// (ไม่มี hook — ปลอดภัยทั้งสองฝั่ง)
type OnboardingBannerProps = {
  eyebrow: string
  title: string
  description: string
  testId?: string
}

export function OnboardingBanner({ eyebrow, title, description, testId }: OnboardingBannerProps) {
  return (
    <div
      data-testid={testId}
      className="max-w-2xl mx-auto mb-6 flex gap-4 rounded-2xl border border-dashed border-ruled bg-panel/60 p-5"
    >
      <span
        aria-hidden
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pen/10 font-mono text-sm font-bold text-pen"
      >
        !
      </span>
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-wider text-pen">{eyebrow}</p>
        <p className="mb-1 text-sm font-bold text-ink">{title}</p>
        <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
      </div>
    </div>
  )
}
