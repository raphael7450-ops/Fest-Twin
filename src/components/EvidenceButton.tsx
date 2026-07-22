interface EvidenceButtonProps {
  label?: string;
  onClick: () => void;
}

export function EvidenceButton({
  label = "근거 보기",
  onClick,
}: EvidenceButtonProps) {
  return (
    <button className="evidence-button" type="button" onClick={onClick}>
      {label}
    </button>
  );
}
