import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

export type TextInputProps = ComponentProps<typeof TextFieldPrimitive.Input> & {
  label: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
};

export function TextInput(props: TextInputProps) {
  const [local, inputProps] = splitProps(props, ["label", "name", "value", "onChange", "required"]);

  return (
    <TextFieldPrimitive
      name={local.name}
      value={local.value}
      onChange={local.onChange}
      required={local.required}
      class="flex flex-col gap-1"
    >
      <TextFieldPrimitive.Label class="text-ink-700 text-sm font-medium">
        {local.label}
      </TextFieldPrimitive.Label>
      <TextFieldPrimitive.Input
        class="border-cream-300 bg-cream-50 focus:border-primary-500 focus:ring-primary-500/20 rounded-md border px-3 py-2 text-base focus:ring-2 focus:outline-none"
        {...inputProps}
      />
    </TextFieldPrimitive>
  );
}
