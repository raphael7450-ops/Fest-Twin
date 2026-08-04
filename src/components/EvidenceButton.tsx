interface EvidenceButtonProps {
  label?: string;
  ariaLabel?: string;
  onClick: () => void;
}

export function EvidenceButton({
  label = "근거 보기",
  ariaLabel,
  onClick,
}: EvidenceButtonProps) {
  return (
    <button
      className="evidence-button"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
    >
      {label}
    </button>
  );
}
