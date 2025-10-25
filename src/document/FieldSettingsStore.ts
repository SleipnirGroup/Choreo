import { Instance, SnapshotIn, types } from "mobx-state-tree";

export const FIELD_PRESETS = [
  {
    id: "reefscape2025",
    label: "Reefscape 2025",
    defaultLength: 17.548,
    defaultWidth: 8.052
  },
  {
    id: "decode",
    label: "DECODE Practice Field",
    defaultLength: 3.6576,
    defaultWidth: 3.6576
  }
] as const;

export type FieldPresetId = (typeof FIELD_PRESETS)[number]["id"];
export const CUSTOM_FIELD_ID = "custom" as const;

export const DEFAULT_FIELD_SETTINGS = {
  selectedPresetId: FIELD_PRESETS[0].id,
  customImagePath: undefined,
  fieldLength: FIELD_PRESETS[0].defaultLength,
  fieldWidth: FIELD_PRESETS[0].defaultWidth,
  previewGridSpacing: 1
};

export type SerializedFieldSettings = {
  selectedPresetId: string;
  customImagePath?: string;
  fieldLength: number;
  fieldWidth: number;
  previewGridSpacing: number;
};
export const getPresetById = (id: string | undefined) =>
  FIELD_PRESETS.find((preset) => preset.id === id);

export const FieldSettingsStore = types
  .model("FieldSettingsStore", {
    selectedPresetId: types.string,
    customImagePath: types.maybe(types.string),
    fieldLength: types.number,
    fieldWidth: types.number,
    previewGridSpacing: types.number
  })
  .views((self) => ({
    get isCustom() {
      return self.selectedPresetId === CUSTOM_FIELD_ID;
    },
    get dimensions() {
      return { length: self.fieldLength, width: self.fieldWidth };
    },
    get serialize() {
      return {
        selectedPresetId: self.selectedPresetId,
        customImagePath: self.customImagePath ?? undefined,
        fieldLength: self.fieldLength,
        fieldWidth: self.fieldWidth,
        previewGridSpacing: self.previewGridSpacing
      };
    }
  }))
  .actions((self) => ({
    selectPreset(presetId: string) {
      self.selectedPresetId = presetId;
      const preset = FIELD_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        self.fieldLength = preset.defaultLength;
        self.fieldWidth = preset.defaultWidth;
        self.customImagePath = undefined;
      }
    },
    setDimensions(length: number, width: number) {
      self.fieldLength = length;
      self.fieldWidth = width;
    },
    setPreviewGridSpacing(spacing: number) {
      self.previewGridSpacing = spacing;
    },
    resetToPresetDefaults() {
      const preset = FIELD_PRESETS.find((p) => p.id === self.selectedPresetId);
      if (preset) {
        self.fieldLength = preset.defaultLength;
        self.fieldWidth = preset.defaultWidth;
      }
    },
    setCustomImagePath(path: string | undefined) {
      self.customImagePath = path;
    },
    hydrate(snapshot: Partial<FieldSettingsSnapshot>) {
      if (snapshot.selectedPresetId) {
        self.selectedPresetId = snapshot.selectedPresetId;
      }
      if (snapshot.fieldLength !== undefined) {
        self.fieldLength = snapshot.fieldLength;
      }
      if (snapshot.fieldWidth !== undefined) {
        self.fieldWidth = snapshot.fieldWidth;
      }
      if (snapshot.previewGridSpacing !== undefined) {
        self.previewGridSpacing = snapshot.previewGridSpacing;
      }
      if (snapshot.customImagePath !== undefined) {
        self.customImagePath = snapshot.customImagePath ?? undefined;
      }
    }
  }));

export interface IFieldSettingsStore
  extends Instance<typeof FieldSettingsStore> {}

export type FieldSettingsSnapshot = SnapshotIn<typeof FieldSettingsStore>;
