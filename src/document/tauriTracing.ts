import { invoke } from "@tauri-apps/api";

type Location = {
  file: string;
  function: string | undefined;
};

function parseStack(stack: string | undefined): Location {
  if (!stack) {
    return { file: "unknown", function: undefined };
  }

  try {
    if (stack.includes("at ")) {
      //parse v8 stack
      const caller: string = stack.split("\n")[2];
      const callerParts: string[] = caller.split(" ");
      const inter: string | undefined = callerParts[callerParts.length - 1]
        .split("/")
        .pop();
      const callerFile: string =
        inter?.split(":")[0].split("?")[0] ?? "unknown";
      let callerFunc: string | undefined = callerParts[callerParts.length - 2];
      if (callerFunc === "Object.<anonymous>") {
        callerFunc = undefined;
      } else if (callerFunc === "at") {
        callerFunc = undefined;
      }
      return { file: callerFile, function: callerFunc };
    } else {
      // parse spidermonkey / jscore stack
      const caller: string = stack.split("\n")[1];
      const callerParts: string[] = caller.split("@");
      const callerFunc: string = callerParts[0];
      const callerFile: string = callerParts[1].split(":")[0];
      return { file: callerFile, function: callerFunc };
    }
  } catch (e) {
    console.error("Failed to parse stack", e);
    return { file: "unknown", function: undefined };
  }
}

function trace(level: string, stack: Error, ...data: any[]): void {
  const location = parseStack(stack.stack);
  invoke("tracing_frontend", {
    level: level,
    msg: data.map((p) => p.toString()).join(" "),
    file: location.file,
    function: location.function
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
    trace("debug", new Error(), message, ...optionalParams);
  },
  /**
   * A console.log substitute that logs the value to the native tracing pipeline.
   *
   * @param message The message to be logged. This will be converted to a string.
   * @param optionalParams Additional parameters to be logged.
   */
  info: (message: any, ...optionalParams: any[]) => {
    console.log(message, optionalParams);
    trace("info", new Error(), message, ...optionalParams);
  },
  /**
   * A console.warn substitute that logs the warning to the native tracing pipeline.
   *
   * @param message The message to be logged. This will be converted to a string.
   * @param optionalParams Additional parameters to be logged.
   */
  warn: (message: any, ...optionalParams: any[]) => {
    console.warn(message, optionalParams);
    trace("warn", new Error(), message, ...optionalParams);
  },
  /**
   * A console.error substitute that logs the error to the native tracing pipeline.
   *
   * @param message The message to be logged. This will be converted to a string.
   * @param optionalParams Additional parameters to be logged.
   */
  error: (message: any, ...optionalParams: any[]) => {
    console.error(message, optionalParams);
    trace("error", new Error(), message, ...optionalParams);
  }
};
