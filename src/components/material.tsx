import React from "react";
import { createComponent } from "@lit/react";
import { MdCheckbox } from "@material/web/checkbox/checkbox.js";
import { MdFilledButton } from "@material/web/button/filled-button.js";
import { MdFilledTonalButton } from "@material/web/button/filled-tonal-button.js";
import { MdOutlinedButton } from "@material/web/button/outlined-button.js";
import { MdTextButton } from "@material/web/button/text-button.js";
import { MdDialog } from "@material/web/dialog/dialog.js";
import { MdFab } from "@material/web/fab/fab.js";
import { MdFilledCard } from "@material/web/labs/card/filled-card.js";
import { MdOutlinedCard } from "@material/web/labs/card/outlined-card.js";
import { MdOutlinedSegmentedButton } from "@material/web/labs/segmentedbutton/outlined-segmented-button.js";
import { MdOutlinedSegmentedButtonSet } from "@material/web/labs/segmentedbuttonset/outlined-segmented-button-set.js";
import { MdIconButton } from "@material/web/iconbutton/icon-button.js";
import { MdLinearProgress } from "@material/web/progress/linear-progress.js";
import { MdOutlinedSelect } from "@material/web/select/outlined-select.js";
import { MdSelectOption } from "@material/web/select/select-option.js";
import { MdSwitch } from "@material/web/switch/switch.js";
import { MdOutlinedTextField } from "@material/web/textfield/outlined-text-field.js";

export const FilledButton = createComponent({
  react: React,
  tagName: "md-filled-button",
  elementClass: MdFilledButton,
  events: { onClick: "click" },
});

export const TonalButton = createComponent({
  react: React,
  tagName: "md-filled-tonal-button",
  elementClass: MdFilledTonalButton,
  events: { onClick: "click" },
});

export const OutlinedButton = createComponent({
  react: React,
  tagName: "md-outlined-button",
  elementClass: MdOutlinedButton,
  events: { onClick: "click" },
});

export const TextButton = createComponent({
  react: React,
  tagName: "md-text-button",
  elementClass: MdTextButton,
  events: { onClick: "click" },
});

export const IconButton = createComponent({
  react: React,
  tagName: "md-icon-button",
  elementClass: MdIconButton,
  events: { onClick: "click", onChange: "change" },
});

export const Fab = createComponent({
  react: React,
  tagName: "md-fab",
  elementClass: MdFab,
  events: { onClick: "click" },
});

export const OutlinedTextField = createComponent({
  react: React,
  tagName: "md-outlined-text-field",
  elementClass: MdOutlinedTextField,
  events: { onInput: "input", onChange: "change" },
});

export const OutlinedSelect = createComponent({
  react: React,
  tagName: "md-outlined-select",
  elementClass: MdOutlinedSelect,
  events: { onInput: "input", onChange: "change" },
});

export const SelectOption = createComponent({
  react: React,
  tagName: "md-select-option",
  elementClass: MdSelectOption,
});

export const Checkbox = createComponent({
  react: React,
  tagName: "md-checkbox",
  elementClass: MdCheckbox,
  events: { onInput: "input", onChange: "change", onClick: "click" },
});

export const Switch = createComponent({
  react: React,
  tagName: "md-switch",
  elementClass: MdSwitch,
  events: { onInput: "input", onChange: "change", onClick: "click" },
});

export const LinearProgress = createComponent({
  react: React,
  tagName: "md-linear-progress",
  elementClass: MdLinearProgress,
});

export const MaterialDialog = createComponent({
  react: React,
  tagName: "md-dialog",
  elementClass: MdDialog,
  events: {
    onCancel: "cancel",
    onClose: "close",
    onClosed: "closed",
    onOpened: "opened",
  },
});

export const FilledCard = createComponent({
  react: React,
  tagName: "md-filled-card",
  elementClass: MdFilledCard,
});

export const OutlinedCard = createComponent({
  react: React,
  tagName: "md-outlined-card",
  elementClass: MdOutlinedCard,
});

export const OutlinedSegmentedButton = createComponent({
  react: React,
  tagName: "md-outlined-segmented-button",
  elementClass: MdOutlinedSegmentedButton,
  events: { onClick: "click" },
});

export const OutlinedSegmentedButtonSet = createComponent({
  react: React,
  tagName: "md-outlined-segmented-button-set",
  elementClass: MdOutlinedSegmentedButtonSet,
  events: { onSelection: "segmented-button-set-selection" },
});

export function eventValue(event: Event): string {
  return (event.currentTarget as HTMLElement & { value: string }).value;
}
