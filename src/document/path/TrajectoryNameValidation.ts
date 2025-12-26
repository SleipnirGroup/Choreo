// This list of reserved words includes the literals "true", "false", "null", also invalid identifiers.
const JAVA_KEYWORDS = [
  "abstract",
  "continue",
  "for",
  "new",
  "switch",
  "assert",
  "default",
  "goto",
  "package",
  "synchronized",
  "boolean",
  "do",
  "if",
  "private",
  "this",
  "break",
  "double",
  "implements",
  "protected",
  "throw",
  "byte",
  "else",
  "import",
  "public",
  "throws",
  "case",
  "enum",
  "instanceof",
  "return",
  "transient",
  "catch",
  "extends",
  "int",
  "short",
  "try",
  "char",
  "final",
  "interface",
  "static",
  "void",
  "class",
  "finally",
  "long",
  "strictfp",
  "volatile",
  "const*",
  "float",
  "native",
  "super",
  "while",
  "true",
  "false",
  "null"
];

const PYTHON_KEYWORDS = [
"False",
"class",
"from",
"or",
"None",
"continue",
"global",
"pass",
"True",
"def",
"if",
"raise",
"and",
"del",
"import",
"return",
"as",
"elif",
"in",
"try",
"assert",
"else",
"is",
"while",
"async",
"except",
"lambda",
"with",
"await",
"finally",
"nonlocal",
"yield",
"break",
"for",
"not",
]

export type TrajectoryNameIssueTypes = {
  Empty: { kind: "Empty" };
  Exists: { kind: "Exists"; name: string };
  StartsWithNumber: { kind: "StartsWithNumber"; name: string };
  InvalidCharacter: {
    kind: "InvalidCharacter";
    name: string;
    character: string[];
  };
  IsJavaKeyword: { kind: "IsJavaKeyword"; name: string };
  IsPythonKeyword: { kind: "IsPythonKeyword"; name: string};
};
export type TrajectoryNameIssues = keyof TrajectoryNameIssueTypes;
export type TrajectoryNameIssue =
  TrajectoryNameIssueTypes[keyof TrajectoryNameIssueTypes] & {
    uiMessage: string;
    codegenMessage: string;
  };
const SHOULD_NOT_APPEAR_CODEGEN = `This error should never appear in generated code. Tell the developers.`;
const RENAME_TRAJECTORY = `Rename it in the Choreo app to fix this error.`;
export const TrajectoryNameErrorMessages = {
  Empty: (_issue) => [
    `Empty`,
    SHOULD_NOT_APPEAR_CODEGEN
  ],
  Exists: (_) => [
    `Exists`,
    SHOULD_NOT_APPEAR_CODEGEN
  ],
  StartsWithNumber: (_) => [
    `Must start with letter or _`,
    RENAME_TRAJECTORY
  ],
  InvalidCharacter: ({character }) => [
    `Can only use letters, 0-9, and _. Can't use ${character.map((c) => `${c.replace(" ", "[space]")}`).join(" ")}`,
    //`Can't use ${character.map((c) => `${.replace(" ", "[space]")}`).join(" ")}.`,
    RENAME_TRAJECTORY
  ],
  IsJavaKeyword: (_) => [
    `Can't be Java keyword`,
    RENAME_TRAJECTORY
  ],
  IsPythonKeyword: (_) => [
    `Can't be Python keyword`,
    RENAME_TRAJECTORY
  ]
} as const satisfies {
  [I in TrajectoryNameIssues]: (issue: TrajectoryNameIssueTypes[I]) => [
    string, //UI and codegen message
    string // codegen-only message (describes solution)
  ];
};
export function internalIsValidTrajectoryName(
  name: string,
  existingNames?: string[]
): TrajectoryNameIssueTypes[TrajectoryNameIssues] | undefined {
  if (name.length === 0) return { kind: "Empty" };
  if (existingNames !== undefined && existingNames.includes(name))
    return { kind: "Exists", name };
  if (name.at(0)?.match("[0-9]")) return { kind: "StartsWithNumber", name };
  // Get a deduplicated list of invalid characters.
  // deduplication for string arrays in https://stackoverflow.com/a/9229821
  const alreadyFlaggedCharacters: Record<string, boolean> = {};
  const invalidCharacters = name
    .matchAll(RegExp("[^A-Za-z0-9_]", "g"))
    .map((match) => match[0])
    .filter(function (item) {
      return alreadyFlaggedCharacters.hasOwnProperty(item)
        ? false
        : (alreadyFlaggedCharacters[item] = true);
    })
    .toArray();

  if (invalidCharacters.length > 0) {
    return { kind: "InvalidCharacter", name, character: invalidCharacters };
  }
  if (JAVA_KEYWORDS.includes(name)) return { kind: "IsJavaKeyword", name };
  if (PYTHON_KEYWORDS.includes(name)) return { kind: "IsPythonKeyword", name};
}
export function getErrorMessages(problem: TrajectoryNameIssueTypes[keyof TrajectoryNameIssueTypes]) {
  const messageGetter = TrajectoryNameErrorMessages[problem.kind] as (
    issue: typeof problem
  ) => [string, string];
  return messageGetter(problem);
}
export function isValidTrajectoryName(
  name: string,
  existingNames?: string[]
): TrajectoryNameIssue | undefined {
  const problem = internalIsValidTrajectoryName(name, existingNames);
  if (problem === undefined) return undefined;
  const messages = getErrorMessages(problem);
  return {
    ...problem,
    uiMessage: messages[0],
    codegenMessage: messages[1]
  };
}

function testTrajectoryNameValidators(): boolean {
  const OK_TEST_CASES = ["test", "NewPath"];
  const ISSUE_TEST_CASES = {
    Empty: [""],
    StartsWithNumber: [], // TODO
    InvalidCharacter: ["New Path"], // TODO
    IsJavaKeyword: JAVA_KEYWORDS,
    IsPythonKeyword: PYTHON_KEYWORDS,
    Exists: OK_TEST_CASES
  } as const satisfies { [I in TrajectoryNameIssues]: string[] };
  return (
    Object.entries(ISSUE_TEST_CASES).every(([issueType, names]) =>
      names
        .map((name) => {
          if ((issueType as TrajectoryNameIssues) === "Exists") {
            // Expect failure because the name is already in use.
            return isValidTrajectoryName(name, OK_TEST_CASES);
          } else {
            // Skip in-use checks and expect the name to be otherwise invalid.
            return isValidTrajectoryName(name);
          }
        })
        .every((issue) => issue !== undefined && issue.kind === issueType)
    ) &&
    OK_TEST_CASES.map((name) => isValidTrajectoryName(name)).every(
      (issue) => issue === undefined
    )
  );
}
