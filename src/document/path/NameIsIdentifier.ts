// Utilities for determining if a string is a valid identifier for codegen purposes.

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

export type NameIssues = {
  Empty: { kind: "Empty" };
  Exists: { kind: "Exists"; name: string };
  InvalidStartCharacter: { kind: "InvalidStartCharacter"; name: string };
  InvalidCharacter: {
    kind: "InvalidCharacter";
    name: string;
    character: string[];
  };
  IsJavaKeyword: { kind: "IsJavaKeyword"; name: string };
  IsPythonKeyword: { kind: "IsPythonKeyword"; name: string};
  IsMathJSDefined: {kind: "IsMathJSDefined"; name: string};
};
export type NameIssueKind = keyof NameIssues;
export type NameIssue =
  NameIssues[NameIssueKind] & {
    uiMessage: string;
    codegenMessage: string;
  };
const SHOULD_NOT_APPEAR_CODEGEN = `This error should never appear in generated code. Tell the developers.`;
const RENAME = `Rename it in the Choreo app to fix this error.`;
export const TrajectoryNameErrorMessages = {
  Empty: (_issue) => [
    `Empty`,
    SHOULD_NOT_APPEAR_CODEGEN
  ],
  Exists: (_) => [
    `Exists`,
    SHOULD_NOT_APPEAR_CODEGEN
  ],
  InvalidStartCharacter: (_) => [
    `Must start with letter`,
    RENAME
  ],
  InvalidCharacter: ({character }) => [
    `Can only use letters, 0-9, and _. Can't use ${character.map((c) => `${c.replace(" ", "[space]")}`).join(" ")}`,
    //`Can't use ${character.map((c) => `${.replace(" ", "[space]")}`).join(" ")}.`,
    RENAME
  ],
  IsJavaKeyword: (_) => [
    `Can't be Java keyword`,
    RENAME
  ],
  IsPythonKeyword: (_) => [
    `Can't be Python keyword`,
    RENAME
  ],
  IsMathJSDefined: (_) => [
    `Already defined in math parser`,
    RENAME
  ]
} as const satisfies {
  [I in NameIssueKind]: (issue: NameIssues[I]) => [
    string, //UI and codegen message
    string // codegen-only message (describes solution)
  ];
};
export function internalIsIdentifier(
  name: string
): NameIssues[NameIssueKind] | undefined {
  if (name.length === 0) return { kind: "Empty" };

  if (name.at(0)?.match("[0-9_]")) return { kind: "InvalidStartCharacter", name };
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
export function addErrorMessages(problem: NameIssues[keyof NameIssues]) : NameIssue {
  const messageGetter = TrajectoryNameErrorMessages[problem.kind] as (
    issue: typeof problem
  ) => [string, string];
  const messages =  messageGetter(problem);
  return {
    ...problem,
    uiMessage: messages[0],
    codegenMessage: messages[1]
  };
}
export function isValidIdentifier(
  name: string,
): NameIssue | undefined {
  const problem = internalIsIdentifier(name);
  if (problem === undefined) return undefined;
  return addErrorMessages(problem);
}

function testIdentifierValidators(): boolean {
  const OK_TEST_CASES = ["test", "NewPath"];
  const ISSUE_TEST_CASES = {
    Empty: [""],
    InvalidStartCharacter: [], // TODO
    InvalidCharacter: ["New Path"], // TODO
    IsJavaKeyword: JAVA_KEYWORDS,
    IsPythonKeyword: PYTHON_KEYWORDS,
    IsMathJSDefined: [],
    Exists: OK_TEST_CASES
  } as const satisfies { [I in NameIssueKind]: string[] };
  return (
    Object.entries(ISSUE_TEST_CASES).every(([issueType, names]) =>
      names
        .map((name) => {
          if ((issueType as NameIssueKind) === "Exists") {
              if (OK_TEST_CASES.includes(name)){
                return { kind: "Exists", name };
              }

            // Expect failure because the name is already in use.
            return isValidIdentifier(name);
          } else {
            // Skip in-use checks and expect the name to be otherwise invalid.
            return isValidIdentifier(name);
          }
        })
        .every((issue) => issue !== undefined && issue.kind === issueType)
    ) &&
    OK_TEST_CASES.map((name) => isValidIdentifier(name)).every(
      (issue) => issue === undefined
    )
  );
}
