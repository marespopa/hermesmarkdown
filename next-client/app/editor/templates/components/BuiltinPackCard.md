# BuiltinPackCard

Description: A template pack the app ships, on the Templates page: its name, what it's for, and its templates (name and one-line description, "in your vault" for those already there). The button reads **Add to vault**, **Add N missing** when some of its files exist, or **Added** (disabled) when all do; it's disabled without a vault. The card is a region named "<pack> pack".

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `Button`, `TemplateIcon`, `BuiltinPack` from `app/utils/templates/template-packs.ts`, `SMALL_BUTTON_CLASS` from `PackSection`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import BuiltinPackCard from "@/app/editor/templates/components/BuiltinPackCard";

<BuiltinPackCard pack={pack} inVault={packTemplatesInVault(pack, folder, paths)} onAdd={addBuiltinPack} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| pack | `BuiltinPack` |  | The built-in pack |
| inVault | `Set<string>` |  | Names of its templates already in the vault |
| onAdd | `(pack) => void` |  | Copy the pack into the vault |
| disabled? | `boolean` | `false` | No vault open |
