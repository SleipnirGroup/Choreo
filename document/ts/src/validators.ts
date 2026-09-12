import Ajv2020, {
  type ErrorObject,
  type ValidateFunction
} from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../schema.json";
import type {
  ProgressUpdateMessage,
  ProjectFile,
  TrajectoryFile
} from "./generated/types";

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: ErrorObject[] };

const SCHEMA_ID = "choreo-document-schema";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema);

function getValidator<T>(refPath: string): ValidateFunction<T> {
  const validator = ajv.getSchema(`${SCHEMA_ID}#/$defs/${refPath}`);
  if (!validator) {
    throw new Error(`Missing validator for schema path: ${refPath}`);
  }

  return validator as ValidateFunction<T>;
}

const projectFileValidator = getValidator<ProjectFile>("ProjectFile");
const trajectoryFileValidator = getValidator<TrajectoryFile>("TrajectoryFile");
const progressUpdateValidator = getValidator<ProgressUpdateMessage>(
  "ProgressUpdateMessage"
);

function validate<T>(
  validator: ValidateFunction<T>,
  data: unknown
): ValidationResult<T> {
  if (validator(data)) {
    return { valid: true, data: data as T };
  }

  return { valid: false, errors: [...(validator.errors ?? [])] };
}

export function validateProjectFile(
  data: unknown
): ValidationResult<ProjectFile> {
  return validate(projectFileValidator, data);
}

export function validateTrajectoryFile(
  data: unknown
): ValidationResult<TrajectoryFile> {
  return validate(trajectoryFileValidator, data);
}

export function validateProgressUpdate(
  data: unknown
): ValidationResult<ProgressUpdateMessage> {
  return validate(progressUpdateValidator, data);
}
