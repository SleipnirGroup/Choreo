import { invoke } from "@tauri-apps/api";

/**
 * A console.log substitute that logs the value to the native tracing pipeline.
 * 
 * @param message The message to be logged. This will be converted to a string.
 * @param optionalParams Additional parameters to be logged.
 */
export function TraceDebug(message: any, ...optionalParams: any[]): void {
  console.log(message, optionalParams);
  //get the line number of the caller and the file
  let stack: string = new Error().stack ?? "";
  let caller: string = stack.split("\n")[2];
  let callerParts: string[] = caller.split(" ");
  let inter: string | undefined = callerParts[callerParts.length - 1]
    .split("/")
    .pop();
  let callerFile: string | undefined = inter?.split(":")[0];
  let callerLine: string | undefined = inter?.split(":")[1].split(")")[0];
  if (optionalParams.length === 0) {
    invoke("tracing_frontend", {
      level: "debug",
      msg: message.toString(),
      line: callerLine,
      file: callerFile,
    });
  } else {
    invoke("tracing_frontend", {
      level: "debug",
      msg:
        message.toString() +
        " " +
        optionalParams.map((p) => p.toString()).join(" "),
      line: callerLine,
      file: callerFile,
    });
  }
}

/**
 * A console.log substitute that logs the value to the native tracing pipeline.
 * 
 * @param message The message to be logged. This will be converted to a string.
 * @param optionalParams Additional parameters to be logged.
 */
export function TraceInfo(message: any, ...optionalParams: any[]): void {
  console.log(message, optionalParams);
  //get the line number of the caller and the file
  let stack: string = new Error().stack ?? "";
  let caller: string = stack.split("\n")[2];
  let callerParts: string[] = caller.split(" ");
  let inter: string | undefined = callerParts[callerParts.length - 1]
    .split("/")
    .pop();
  let callerFile: string | undefined = inter?.split(":")[0];
  let callerLine: string | undefined = inter?.split(":")[1].split(")")[0];
  if (optionalParams.length === 0) {
    invoke("tracing_frontend", {
      level: "info",
      msg: message.toString(),
      line: callerLine,
      file: callerFile,
    });
  } else {
    invoke("tracing_frontend", {
      level: "info",
      msg:
        message.toString() +
        " " +
        optionalParams.map((p) => p.toString()).join(" "),
      line: callerLine,
      file: callerFile,
    });
  }
}

/**
 * A console.warn substitute that logs the warning to the native tracing pipeline.
 * 
 * @param message The message to be logged. This will be converted to a string.
 * @param optionalParams Additional parameters to be logged.
 */
export function TraceWarn(message: any, ...optionalParams: any[]): void {
  console.log(message, optionalParams);
  //get the line number of the caller and the file
  let stack: string = new Error().stack ?? "";
  let caller: string = stack.split("\n")[2];
  let callerParts: string[] = caller.split(" ");
  let inter: string | undefined = callerParts[callerParts.length - 1]
    .split("/")
    .pop();
  let callerFile: string | undefined = inter?.split(":")[0];
  let callerLine: string | undefined = inter?.split(":")[1].split(")")[0];
  if (optionalParams.length === 0) {
    invoke("tracing_frontend", {
      level: "warn",
      msg: message.toString(),
      line: callerLine,
      file: callerFile,
    });
  } else {
    invoke("tracing_frontend", {
      level: "warn",
      msg:
        message.toString() +
        " " +
        optionalParams.map((p) => p.toString()).join(" "),
      line: callerLine,
      file: callerFile,
    });
  }
}

/**
 * A console.error substitute that logs the error to the native tracing pipeline.
 * 
 * @param message The message to be logged. This will be converted to a string.
 * @param optionalParams Additional parameters to be logged.
 */
export function TraceError(message: any, ...optionalParams: any[]): void {
  console.log(message, optionalParams);
  //get the line number of the caller and the file
  let stack: string = new Error().stack ?? "";
  let caller: string = stack.split("\n")[2];
  let callerParts: string[] = caller.split(" ");
  let inter: string | undefined = callerParts[callerParts.length - 1]
    .split("/")
    .pop();
  let callerFile: string | undefined = inter?.split(":")[0];
  let callerLine: string | undefined = inter?.split(":")[1].split(")")[0];
  if (optionalParams.length === 0) {
    invoke("tracing_frontend", {
      level: "error",
      msg: message.toString(),
      line: callerLine,
      file: callerFile,
    });
  } else {
    invoke("tracing_frontend", {
      level: "error",
      msg:
        message.toString() +
        " " +
        optionalParams.map((p) => p.toString()).join(" "),
      line: callerLine,
      file: callerFile,
    });
  }
}

/**
 * A tracing substitute for console.error. This will log the error to the native tracing pipeline.
 * @param data The data to be logged. This will be converted to a string.
 */
export function ErrorHook(data: any[]): void {
  console.error(data);
  let stack: string = new Error().stack ?? "";
  let caller: string = stack.split("\n")[2];
  let callerParts: string[] = caller.split(" ");
  let inter: string | undefined = callerParts[callerParts.length - 1]
    .split("/")
    .pop();
  let callerFile: string | undefined = inter?.split(":")[0];
  let callerLine: string | undefined = inter?.split(":")[1].split(")")[0];
  invoke("tracing_frontend", {
    level: "error",
    msg: data.map((p) => p.toString()).join(" "),
    line: callerLine,
    file: callerFile,
  });
}