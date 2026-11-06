import type { ModelInfo } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { Selection } from "react-aria-components";
import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import { useLabels } from "../primitives/labels";
import { Menu, MenuItem, MenuNote, MenuSection, MenuSeparator, MenuTrigger, Popover, SubmenuTrigger } from "../primitives/menu";

export interface ModelPickerProps {
  models: ModelInfo[];
  model: string;
  onModelChange: (id: string) => void;
  effort?: string;
  onEffortChange?: (id: string) => void;
  /** Explains effort at the top of the Effort submenu. */
  effortNote?: ReactNode;
  /** Small print at the bottom of the menu, e.g. a link to model docs. */
  footnote?: ReactNode;
  className?: string;
}

/** "Opus 5.5  High ⌄": the models, an Effort submenu for models that have levels, and More models. */
export function ModelPicker({
  models,
  model,
  onModelChange,
  effort,
  onEffortChange,
  effortNote,
  footnote,
  className,
}: ModelPickerProps) {
  const labels = useLabels();
  const current = models.find((m) => m.id === model);
  const efforts = current?.efforts ?? [];
  const currentEffort = efforts.find((e) => e.id === (effort ?? current?.defaultEffort));
  const main = models.filter((m) => !m.secondary);
  const more = models.filter((m) => m.secondary);

  const item = (m: ModelInfo) => (
    <MenuItem key={m.id} id={m.id} description={m.disabledReason ?? m.description} isDisabled={m.disabled ?? false}>
      {m.label}
    </MenuItem>
  );
  const pick = (keys: Selection) => {
    if (keys === "all") return;
    const [id] = keys;
    if (id !== undefined) onModelChange(String(id));
  };

  return (
    <MenuTrigger>
      <Button size="sm" aria-label={labels.modelButton(current?.label ?? model)} className={clsx("text-chat-muted data-hovered:text-chat-fg", className)}>
        <span className="min-w-0 truncate text-chat-fg">{current?.label ?? model}</span>
        {currentEffort && <span className="chat-picker-detail text-chat-muted">{currentEffort.label}</span>}
        <ChevronDown aria-hidden className="size-3.5" />
      </Button>
      <Popover placement="top end" className="w-72">
        <Menu aria-label={labels.model}>
          <MenuSection selectionMode="single" selectedKeys={[model]} onSelectionChange={pick}>
            {main.map(item)}
          </MenuSection>
          {(efforts.length > 0 || more.length > 0) && <MenuSeparator />}
          {efforts.length > 0 && onEffortChange && (
            <SubmenuTrigger>
              <MenuItem id="__effort" detail={currentEffort?.label}>
                {labels.effort}
              </MenuItem>
              <Popover placement="end top" className="w-80">
                <MenuNote>{effortNote ?? labels.effortNote}</MenuNote>
                <Menu
                  aria-label={labels.effort}
                  selectionMode="single"
                  selectedKeys={currentEffort ? [currentEffort.id] : []}
                  onSelectionChange={(keys) => {
                    if (keys === "all") return;
                    const [id] = keys;
                    if (id !== undefined) onEffortChange(String(id));
                  }}
                >
                  {efforts.map((e) => (
                    <MenuItem key={e.id} id={e.id} textValue={e.label}>
                      <span className="flex items-center gap-2">
                        {e.label}
                        {e.recommended && <Badge>{labels.recommended}</Badge>}
                        {e.warning && (
                          <Badge tone="warning" icon={<AlertTriangle />}>
                            {e.warning}
                          </Badge>
                        )}
                      </span>
                    </MenuItem>
                  ))}
                </Menu>
              </Popover>
            </SubmenuTrigger>
          )}
          {more.length > 0 && (
            <SubmenuTrigger>
              <MenuItem id="__more">{labels.moreModels}</MenuItem>
              <Popover placement="end top" className="w-72">
                <Menu aria-label={labels.moreModels} selectionMode="single" selectedKeys={[model]} onSelectionChange={pick}>
                  {more.map(item)}
                </Menu>
              </Popover>
            </SubmenuTrigger>
          )}
        </Menu>
        {footnote && <MenuNote className="border-t border-chat-popover-border text-xs">{footnote}</MenuNote>}
      </Popover>
    </MenuTrigger>
  );
}
