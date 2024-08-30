import { invoke } from "@tauri-apps/api";

type Location = {
  line: string;
  file: string;
};

function parseStack(stack: string | undefined): Location {
  if (!stack) {
    return { line: "-1", file: "unknown" };
  }
  const caller: string = stack.split("\n")[2];
  const isAsync: boolean = caller.includes("async");
  const callerParts: string[] = caller.split(" ");
  const inter: string | undefined = callerParts[callerParts.length - 1]
    .split("/")
    .pop();
  const callerFile: string = inter?.split(":")[0].split("?")[0] ?? "unknown";
  const callerLine: string = inter?.split(":")[1].split(")")[0] ?? "-1";
  if (isAsync) {
    return { line: "async", file: callerFile };
  }
  return { line: callerLine, file: callerFile };
}

function trace(level: string, stack: string | undefined, ...data: any[]): void {
  const location = parseStack(stack);
  invoke("tracing_frontend", {
    level: level,
    msg: data.map((p) => p.toString()).join(" "),
    line: location.line,
    file: location.file
  });
}

export const tracing = {
  /**
   * A console.log substitute that logs the value to the native tracing pipeline.
   *
   * @param message The message to be logged. This will be converted to a string.
   * @param optionalParams Additional parameters to be logged.
   */
  debug: (message: any, ...optionalParams: any[]) => {
    console.log(message, optionalParams);
    trace("debug", new Error().stack, message, ...optionalParams);
  },
  /**
   * A console.log substitute that logs the value to the native tracing pipeline.
   *
   * @param message The message to be logged. This will be converted to a string.
   * @param optionalParams Additional parameters to be logged.
   */
  info: (message: any, ...optionalParams: any[]) => {
    console.log(message, optionalParams);
    trace("info", new Error().stack, message, ...optionalParams);
  },
  /**
   * A console.warn substitute that logs the warning to the native tracing pipeline.
   *
   * @param message The message to be logged. This will be converted to a string.
   * @param optionalParams Additional parameters to be logged.
   */
  warn: (message: any, ...optionalParams: any[]) => {
    console.warn(message, optionalParams);
    trace("warn", new Error().stack, message, ...optionalParams);
  },
  /**
   * A console.error substitute that logs the error to the native tracing pipeline.
   *
   * @param message The message to be logged. This will be converted to a string.
   * @param optionalParams Additional parameters to be logged.
   */
  error: (message: any, ...optionalParams: any[]) => {
    console.error(message, optionalParams);
    trace("error", new Error().stack, message, ...optionalParams);
  }
};
