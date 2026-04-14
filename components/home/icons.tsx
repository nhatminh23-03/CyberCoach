type IconProps = {
  className?: string;
};

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 3l7 3.2V12c0 4.4-2.5 7.9-7 9-4.5-1.1-7-4.6-7-9V6.2L12 3Z" />
      <path d="m8.8 12.2 2.1 2.1 4.5-4.7" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="5" y="10" width="14" height="10" />
      <path d="M8 10V7.5a4 4 0 1 1 8 0V10" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17" />
      <path d="M3.5 15h17" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M5 6.5h14v9H9l-4 3v-12Z" />
    </svg>
  );
}

export function SmsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" />
      <path d="m7 10 2.8 2.6L17 8.8" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <rect x="3.5" y="6" width="17" height="12" />
      <path d="m4.5 7 7.5 6L19.5 7" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.1 2.3 2.3 4.8-5" />
    </svg>
  );
}

export function PhoneCallIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M5.2 4.7c.5-.5 1.3-.6 1.9-.2l2.2 1.4c.6.4.9 1.2.6 1.9l-.8 2.2a1 1 0 0 0 .2 1l3.2 3.2a1 1 0 0 0 1 .2l2.2-.8c.7-.3 1.5 0 1.9.6l1.4 2.2c.4.6.3 1.4-.2 1.9l-1 1c-.9.9-2.3 1.3-3.6.9-2.9-.8-5.6-2.4-7.9-4.7s-3.9-5-4.7-7.9c-.4-1.3 0-2.7.9-3.6l1-1Z" />
      <path d="M15.5 4.5a5 5 0 0 1 4 4" />
      <path d="M15.5 1.5a8 8 0 0 1 7 7" />
    </svg>
  );
}
