import { open } from "@tauri-apps/plugin-dialog";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Paper,
  Tooltip,
  IconButton
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
  const verticalPositions = Array.from(
    { length: Math.max(verticalCount - 1, 0) },
    (_, idx) => (idx + 1) * spacing
  );
  const horizontalPositions = Array.from(
    { length: Math.max(horizontalCount - 1, 0) },
    (_, idx) => (idx + 1) * spacing
  );
  const FieldComponent = preset
    ? BUILTIN_FIELD_COMPONENTS[preset.id as FieldPresetId]
    : undefined;
  const showCustomImage =
    selectedPresetId === CUSTOM_FIELD_ID &&
    fieldSettings.customImagePath !== undefined;
  const imageHref = showCustomImage
    ? convertFileSrc(fieldSettings.customImagePath as string)
    : undefined;

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 400,
        border: 1,
        borderColor: "divider",
        background:
          "linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0.01))"
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%"
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Live Preview
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: "0.813rem" }}
          >
            Real-time rendering with meter grid overlay
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: "#0a0a0a",
            padding: 2,
            flexGrow: 1,
            display: "flex",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)"
            }
          }}
        >
          <Box
            component="svg"
            sx={{
              width: "100%",
              aspectRatio,
              flexGrow: 1,
              alignSelf: "center",
              backgroundColor: "#1a1a1a",
              borderRadius: 1,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
            }}
            viewBox={`0 0 ${fieldLength} ${fieldWidth}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <rect width={fieldLength} height={fieldWidth} fill="#1a1a1a" />
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
                stroke="rgba(100,150,255,0.25)"
                strokeWidth={0.015}
              />
            ))}
            {horizontalPositions.map((y) => (
              <line
                key={`h-${y.toFixed(3)}`}
                x1={0}
                y1={y}
                x2={fieldLength}
                y2={y}
                stroke="rgba(100,150,255,0.25)"
                strokeWidth={0.015}
              />
            ))}
            <rect
              width={fieldLength}
              height={fieldWidth}
              fill="none"
              stroke="rgba(100,150,255,0.5)"
              strokeWidth={0.04}
            />
          </Box>
        </Paper>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "center"
          }}
        >
          <Chip
            label={`${fieldLength.toFixed(3)} m × ${fieldWidth.toFixed(3)} m`}
            size="small"
            variant="outlined"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          />
          <Chip
            label={`Grid: ${spacing.toFixed(3)} m`}
            size="small"
            variant="outlined"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          />
        </Box>
      </CardContent>
    </Card>
  );
});

const FieldSettingsPanel = () => {
  const fieldSettings = uiState.fieldSettings;
  const selectedPresetId = fieldSettings.selectedPresetId;
  const selectedPreset = getPresetById(selectedPresetId ?? undefined);

  const handlePresetChange = useCallback((event: SelectChangeEvent) => {
    uiState.selectFieldPreset(event.target.value as string);
  }, []);

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

  const handleGridSpacingChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = parseFloat(event.target.value);
      if (!Number.isNaN(next) && next > 0) {
        uiState.setPreviewGridSpacing(next);
      }
    },
    []
  );

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
    <Box
      sx={{
        padding: 3,
        height: "100%",
        overflow: "auto",
        maxWidth: "100%"
      }}
    >
      <Stack
        spacing={3}
        direction={{ xs: "column", lg: "row" }}
        alignItems="stretch"
        sx={{
          height: "100%",
          maxWidth: "2000px",
          margin: "0 auto"
        }}
      >
        <Card
          elevation={0}
          sx={{
            flex: 1,
            minWidth: 400,
            border: 1,
            borderColor: "divider",
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0.01))"
          }}
        >
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight={600}
                gutterBottom
                sx={{ mb: 0.5 }}
              >
                Field Configuration
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.813rem" }}
              >
                Configure your field image and dimensions
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="overline"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: "text.secondary",
                  mb: 1,
                  display: "block"
                }}
              >
                Image Source
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="field-image-select-label">
                  Select field image
                </InputLabel>
                <Select
                  labelId="field-image-select-label"
                  label="Select field image"
                  value={selectedPresetId}
                  onChange={handlePresetChange}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderWidth: 1.5
                    }
                  }}
                >
                  {FIELD_PRESETS.map((preset) => (
                    <MenuItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </MenuItem>
                  ))}
                  <MenuItem value={CUSTOM_FIELD_ID}>
                    <Box component="span" sx={{ fontStyle: "italic" }}>
                      Custom image…
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              {selectedPreset && selectedPresetId !== CUSTOM_FIELD_ID && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Default: {selectedPreset.defaultLength.toFixed(3)} m ×{" "}
                  {selectedPreset.defaultWidth.toFixed(3)} m
                </Typography>
              )}
            </Box>

            <Box>
              <Typography
                variant="overline"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: "text.secondary",
                  mb: 1,
                  display: "block"
                }}
              >
                Dimensions (meters)
              </Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Length"
                    size="small"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: 0.001 }}
                    value={fieldSettings.fieldLength}
                    onChange={handleLengthChange}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderWidth: 1.5 }
                      }
                    }}
                  />
                  <TextField
                    label="Width"
                    size="small"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: 0.001 }}
                    value={fieldSettings.fieldWidth}
                    onChange={handleWidthChange}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderWidth: 1.5 }
                      }
                    }}
                  />
                </Stack>
                <Button
                  variant="outlined"
                  onClick={() => uiState.resetFieldDimensionsToDefault()}
                  disabled={
                    selectedPresetId === CUSTOM_FIELD_ID ||
                    selectedPreset === undefined
                  }
                  sx={{
                    borderWidth: 1.5,
                    "&:hover": { borderWidth: 1.5 }
                  }}
                >
                  Reset to Defaults
                </Button>
              </Stack>
            </Box>

            <Box>
              <Typography
                variant="overline"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: "text.secondary",
                  mb: 1,
                  display: "block"
                }}
              >
                Preview Grid
              </Typography>
              <TextField
                label="Grid spacing"
                size="small"
                type="number"
                fullWidth
                inputProps={{ min: 0.01, step: 0.1 }}
                value={fieldSettings.previewGridSpacing}
                onChange={handleGridSpacingChange}
                helperText="Distance between grid lines in meters"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderWidth: 1.5 }
                  }
                }}
              />
            </Box>

            {selectedPresetId === CUSTOM_FIELD_ID && (
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    color: "text.secondary",
                    mb: 1,
                    display: "block"
                  }}
                >
                  Custom Image
                </Typography>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      variant="contained"
                      onClick={handleChooseCustomImage}
                      sx={{
                        fontWeight: 600,
                        px: 3
                      }}
                    >
                      Choose Image
                    </Button>
                    {hasCustomImage && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleClearCustomImage}
                        sx={{
                          borderWidth: 1.5,
                          "&:hover": { borderWidth: 1.5 }
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </Stack>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "action.hover",
                      borderStyle: "dashed",
                      borderWidth: 1.5
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        wordBreak: "break-all",
                        fontFamily: "monospace",
                        fontSize: "0.75rem"
                      }}
                    >
                      {hasCustomImage
                        ? fieldSettings.customImagePath
                        : "No custom image selected"}
                    </Typography>
                  </Paper>
                </Stack>
              </Box>
            )}

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "info.main",
                color: "info.contrastText",
                borderColor: "info.dark"
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: "0.75rem", lineHeight: 1.5 }}
              >
                Field dimensions affect coordinate scaling, constraints, and
                overlays throughout the application.
              </Typography>
            </Paper>
          </CardContent>
        </Card>

        <FieldPreview />
      </Stack>
    </Box>
  );
};

export default observer(FieldSettingsPanel);
