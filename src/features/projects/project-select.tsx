import { FieldLayout } from "@/components/ui/field-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProjectSelect<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  disabled = false,
  compact = false,
  className = "",
}: {
  label?: string;
  value: T;
  options: readonly T[];
  labels?: Record<string, string>;
  onChange: (value: T) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        const option = options.find((candidate) => candidate === nextValue);
        if (option) onChange(option);
      }}
      disabled={disabled}
    >
      {label ? (
        <FieldLayout label={label} disabled={disabled}>
          <SelectTrigger
            size={compact ? "sm" : "default"}
            className={`w-full ${className}`}
          >
            <SelectValue>{labels?.[value] ?? value}</SelectValue>
          </SelectTrigger>
        </FieldLayout>
      ) : (
        <SelectTrigger
          size={compact ? "sm" : "default"}
          aria-label="Choose value"
          className={`w-full ${className}`}
        >
          <SelectValue>{labels?.[value] ?? value}</SelectValue>
        </SelectTrigger>
      )}
      <SelectContent position="popper">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {labels?.[option] ?? option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
