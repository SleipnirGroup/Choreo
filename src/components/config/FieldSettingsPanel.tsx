import { open } from "@tauri-apps/plugin-dialog";
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { observer } from "mobx-react";
import { Fragment, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  CUSTOM_FIELD_ID,
  FIELD_PRESETS,
  FieldPresetId,
  getPresetById
} from "../../document/FieldSettingsStore";
import { uiState } from "../../document/DocumentManager";
import FieldImage2025 from "../field/svg/fields/FieldImage2025";
import FieldImageDecode from "../field/svg/fields/FieldImageDecode";

const BUILTIN_FIELD_COMPONENTS: Record<FieldPresetId, React.ComponentType> = {
  reefscape2025: FieldImage2025,
  decode: FieldImageDecode
};

const FieldPreview = observer(() => {
  const fieldSettings = uiState.fieldSettings;
  const selectedPresetId = fieldSettings.selectedPresetId;
  const preset = getPresetById(selectedPresetId);
  const fieldLength = Math.max(fieldSettings.fieldLength, 0.001);
  const fieldWidth = Math.max(fieldSettings.fieldWidth, 0.001);
  const spacing = Math.max(fieldSettings.previewGridSpacing, 0.01);
  const aspectRatio = fieldLength / fieldWidth;
  const verticalCount = Math.floor(fieldLength / spacing);
  const horizontalCount = Math.floor(fieldWidth / spacing);
  const verticalPositions = Array.from({ length: Math.max(verticalCount - 1, 0) }, (_, idx) =>
    (idx + 1) * spacing
  );
  const horizontalPositions = Array.from({ length: Math.max(horizontalCount - 1, 0) }, (_, idx) =>
    (idx + 1) * spacing
  );
  const FieldComponent = preset ? BUILTIN_FIELD_COMPONENTS[preset.id as FieldPresetId] : undefined;
  const showCustomImage =
    selectedPresetId === CUSTOM_FIELD_ID && fieldSettings.customImagePath !== undefined;
  const imageHref = showCustomImage
    ? convertFileSrc(fieldSettings.customImagePath as string)
    : undefined;

  return (
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Preview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Rendering uses the current dimensions and selected image with a meter grid overlay.
        </Typography>
      </Box>
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          backgroundColor: "background.default",
          padding: 1,
          flexGrow: 1,
          display: "flex"
        }}
      >
        <Box
          component="svg"
          sx={{
            width: "100%",
            aspectRatio,
            flexGrow: 1,
            alignSelf: "center",
            backgroundColor: "#1f1f1f"
          }}
          viewBox={`0 0 ${fieldLength} ${fieldWidth}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect width={fieldLength} height={fieldWidth} fill="#1f1f1f" />
          {imageHref && (
            <image
              href={imageHref}
              width={fieldLength}
              height={fieldWidth}
              preserveAspectRatio="none"
            />
          )}
          {!imageHref && FieldComponent && preset && (
            <g
              transform={`scale(${fieldLength / preset.defaultLength} ${
                fieldWidth / preset.defaultWidth
              })`}
            >
              <FieldComponent />
            </g>
          )}
          {/* Grid */}
          {verticalPositions.map((x) => (
            <line
              key={`v-${x.toFixed(3)}`}
              x1={x}
              y1={0}
              x2={x}
              y2={fieldWidth}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={0.02}
            />
          ))}
          {horizontalPositions.map((y) => (
            <line
              key={`h-${y.toFixed(3)}`}
              x1={0}
              y1={y}
              x2={fieldLength}
              y2={y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={0.02}
            />
          ))}
          <rect
            width={fieldLength}
            height={fieldWidth}
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={0.05}
          />
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Field size: {fieldLength.toFixed(3)} m × {fieldWidth.toFixed(3)} m · Grid spacing: {spacing.toFixed(3)} m
      </Typography>
    </Box>
  );
});

const FieldSettingsPanel = () => {
  const fieldSettings = uiState.fieldSettings;
  const selectedPresetId = fieldSettings.selectedPresetId;
  const selectedPreset = getPresetById(selectedPresetId ?? undefined);

  const handlePresetChange = useCallback((event: SelectChangeEvent) => {
    uiState.selectFieldPreset(event.target.value as string);
    },
    []
  );

  const handleLengthChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = parseFloat(event.target.value);
      if (!Number.isNaN(next) && next > 0) {
        uiState.setFieldDimensions(next, fieldSettings.fieldWidth);
      }
    },
    [fieldSettings.fieldWidth]
  );

  const handleWidthChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = parseFloat(event.target.value);
      if (!Number.isNaN(next) && next > 0) {
        uiState.setFieldDimensions(fieldSettings.fieldLength, next);
      }
    },
    [fieldSettings.fieldLength]
  );

  const handleGridSpacingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(event.target.value);
    if (!Number.isNaN(next) && next > 0) {
      uiState.setPreviewGridSpacing(next);
    }
  }, []);

  const handleChooseCustomImage = useCallback(async () => {
    const result = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "svg", "bmp", "gif", "webp"]
        }
      ]
    });
    const selectedPath = Array.isArray(result) ? result[0] : result;
    if (typeof selectedPath === "string" && selectedPath.length > 0) {
      uiState.selectFieldPreset(CUSTOM_FIELD_ID);
      uiState.setCustomFieldImage(selectedPath);
    }
  }, []);

  const handleClearCustomImage = useCallback(() => {
    uiState.setCustomFieldImage(undefined);
  }, []);

  const hasCustomImage =
    selectedPresetId === CUSTOM_FIELD_ID && fieldSettings.customImagePath;

  return (
    <Stack
      spacing={3}
      sx={{ padding: 3 }}
      direction={{ xs: "column", lg: "row" }}
      alignItems="stretch"
    >
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Field Image
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a bundled diagram or supply your own image, then fine-tune the field size.
          </Typography>
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel id="field-image-select-label">Available images</InputLabel>
          <Select
            labelId="field-image-select-label"
            label="Available images"
            value={selectedPresetId}
            onChange={handlePresetChange}
          >
            {FIELD_PRESETS.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.label}
              </MenuItem>
            ))}
            <MenuItem value={CUSTOM_FIELD_ID}>Custom image…</MenuItem>
          </Select>
        </FormControl>
        {selectedPreset && selectedPresetId !== CUSTOM_FIELD_ID && (
          <Typography variant="caption" color="text.secondary">
            Defaults: {selectedPreset.defaultLength.toFixed(3)} m × {" "}
            {selectedPreset.defaultWidth.toFixed(3)} m
          </Typography>
        )}

        <Divider textAlign="left">Dimensions (meters)</Divider>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end">
          <TextField
            label="Field length"
            size="small"
            type="number"
            inputProps={{ min: 0, step: 0.001 }}
            value={fieldSettings.fieldLength}
            onChange={handleLengthChange}
          />
          <TextField
            label="Field width"
            size="small"
            type="number"
            inputProps={{ min: 0, step: 0.001 }}
            value={fieldSettings.fieldWidth}
            onChange={handleWidthChange}
          />
          <Button
            variant="outlined"
            onClick={() => uiState.resetFieldDimensionsToDefault()}
            disabled={
              selectedPresetId === CUSTOM_FIELD_ID || selectedPreset === undefined
            }
          >
            Use defaults
          </Button>
        </Stack>

        <Divider textAlign="left">Preview grid</Divider>
        <TextField
          label="Grid spacing (m)"
          size="small"
          type="number"
          inputProps={{ min: 0.01, step: 0.1 }}
          value={fieldSettings.previewGridSpacing}
          onChange={handleGridSpacingChange}
        />

        {selectedPresetId === CUSTOM_FIELD_ID && (
          <Fragment>
            <Divider textAlign="left">Custom image</Divider>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Button variant="contained" onClick={handleChooseCustomImage}>
                Choose image…
              </Button>
              {hasCustomImage && (
                <Button variant="text" color="inherit" onClick={handleClearCustomImage}>
                  Clear
                </Button>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {hasCustomImage
                ? fieldSettings.customImagePath
                : "No image selected."}
            </Typography>
          </Fragment>
        )}

        <Typography variant="caption" color="text.secondary">
          Dimensions drive coordinate scaling, default constraints, and overlays throughout the app.
        </Typography>
      </Box>

      <FieldPreview />
    </Stack>
  );
};

export default observer(FieldSettingsPanel);
