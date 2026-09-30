import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/services/theme";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const { preference, resolved, setPreference } = useTheme();
  const Current = resolved === "light" ? Sun : Moon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="header-icon-btn focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`Theme: ${preference}. Change theme`}>
        <Current className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setPreference(value)}>
            <Icon /> <span className="flex-1">{label}</span>
            {preference === value && <Check className="text-gold" aria-label="selected" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
