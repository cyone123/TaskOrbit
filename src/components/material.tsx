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
import { MdAssistChip } from "@material/web/chips/assist-chip.js";
import { MdFilterChip } from "@material/web/chips/filter-chip.js";
import { MdInputChip } from "@material/web/chips/input-chip.js";
import { MdSuggestionChip } from "@material/web/chips/suggestion-chip.js";
import { MdChipSet } from "@material/web/chips/chip-set.js";
import { MdBadge } from "@material/web/labs/badge/badge.js";
import { MdElevatedCard } from "@material/web/labs/card/elevated-card.js";
import { MdCircularProgress } from "@material/web/progress/circular-progress.js";
import { MdRadio } from "@material/web/radio/radio.js";
import { MdSlider } from "@material/web/slider/slider.js";
import { MdPrimaryTab } from "@material/web/tabs/primary-tab.js";
import { MdSecondaryTab } from "@material/web/tabs/secondary-tab.js";
import { MdTabs } from "@material/web/tabs/tabs.js";
import { MdList } from "@material/web/list/list.js";
import { MdListItem } from "@material/web/list/list-item.js";
import { MdMenu } from "@material/web/menu/menu.js";
import { MdMenuItem } from "@material/web/menu/menu-item.js";
import { MdRipple } from "@material/web/ripple/ripple.js";
import { MdFocusRing } from "@material/web/focus/md-focus-ring.js";
import { MdDivider } from "@material/web/divider/divider.js";

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

export const CircularProgress = createComponent({
  react: React,
  tagName: "md-circular-progress",
  elementClass: MdCircularProgress,
});

export const Radio = createComponent({
  react: React,
  tagName: "md-radio",
  elementClass: MdRadio,
  events: { onInput: "input", onChange: "change", onClick: "click" },
});

export const Slider = createComponent({
  react: React,
  tagName: "md-slider",
  elementClass: MdSlider,
  events: { onInput: "input", onChange: "change" },
});

export const MaterialBadge = createComponent({
  react: React,
  tagName: "md-badge",
  elementClass: MdBadge,
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

export const ElevatedCard = createComponent({
  react: React,
  tagName: "md-elevated-card",
  elementClass: MdElevatedCard,
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

/* -------------------------------------------------------------------------- */
/* Chips                                                                      */
/* -------------------------------------------------------------------------- */

export const AssistChip = createComponent({
  react: React,
  tagName: "md-assist-chip",
  elementClass: MdAssistChip,
  events: { onClick: "click" },
});

export const FilterChip = createComponent({
  react: React,
  tagName: "md-filter-chip",
  elementClass: MdFilterChip,
  events: { onClick: "click", onChange: "change" },
});

export const InputChip = createComponent({
  react: React,
  tagName: "md-input-chip",
  elementClass: MdInputChip,
  events: { onClick: "click", onRemove: "remove" },
});

export const SuggestionChip = createComponent({
  react: React,
  tagName: "md-suggestion-chip",
  elementClass: MdSuggestionChip,
  events: { onClick: "click" },
});

export const ChipSet = createComponent({
  react: React,
  tagName: "md-chip-set",
  elementClass: MdChipSet,
});

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

export const PrimaryTab = createComponent({
  react: React,
  tagName: "md-primary-tab",
  elementClass: MdPrimaryTab,
  events: { onClick: "click" },
});

export const SecondaryTab = createComponent({
  react: React,
  tagName: "md-secondary-tab",
  elementClass: MdSecondaryTab,
  events: { onClick: "click" },
});

export const Tabs = createComponent({
  react: React,
  tagName: "md-tabs",
  elementClass: MdTabs,
  events: { onChange: "change" },
});

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export const List = createComponent({
  react: React,
  tagName: "md-list",
  elementClass: MdList,
});

export const ListItem = createComponent({
  react: React,
  tagName: "md-list-item",
  elementClass: MdListItem,
  events: { onClick: "click" },
});

/* -------------------------------------------------------------------------- */
/* Menu                                                                       */
/* -------------------------------------------------------------------------- */

export const Menu = createComponent({
  react: React,
  tagName: "md-menu",
  elementClass: MdMenu,
  events: {
    onOpening: "opening",
    onOpened: "opened",
    onClosing: "closing",
    onClosed: "closed",
  },
});

export const MenuItem = createComponent({
  react: React,
  tagName: "md-menu-item",
  elementClass: MdMenuItem,
  events: { onClick: "click" },
});

/* -------------------------------------------------------------------------- */
/* Interaction primitives                                                     */
/* -------------------------------------------------------------------------- */

export const Ripple = createComponent({
  react: React,
  tagName: "md-ripple",
  elementClass: MdRipple,
});

export const FocusRing = createComponent({
  react: React,
  tagName: "md-focus-ring",
  elementClass: MdFocusRing,
});

export const Divider = createComponent({
  react: React,
  tagName: "md-divider",
  elementClass: MdDivider,
});

export function eventValue(event: Event): string {
  return (event.currentTarget as HTMLElement & { value: string }).value;
}
