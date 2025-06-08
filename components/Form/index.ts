// Re-export components
export { default as Button } from "./Button";
export { default as ButtonGroup } from "./ButtonGroup";
export { default as ColorPicker } from "./ColorPicker";
export { default as Form } from "./Form";
export { default as Input } from "./Input";
export { default as InlineInputGroup } from "./InlineInputGroup";
export { default as Switch } from "./Switch";

/*
 * Re-export types and interfaces for external use
 * This allows consumers of the Form directory to import types alongside components.
 */

// From Button.tsx
export type { IButtonProps } from "./Button";

// From ButtonGroup.tsx
export type { IButtonGroupProps, TButtonGroupAlignment } from "./ButtonGroup";

// From ColorPicker.tsx
export type { IColorPickerProps } from "./ColorPicker";

// From Form.tsx
export type { IFormProps } from "./Form";

// From Input.tsx
export type {
  IInputProps,
  IChoice, // IChoice is commonly used for select inputs
  IBaseInputProps,
  ITextInputProps,
  INumberInputProps,
  ITextAreaProps,
  ISelectProps,
  IColorInputProps,
  ICheckboxProps,
  IPhotoUploadProps,
} from "./Input";

// From InlineInputGroup.tsx
export type { IInlineInputGroupProps } from "./InlineInputGroup";

// From Switch.tsx
export type { ISwitchProps } from "./Switch";
