// This list of reserved words includes the literals "true", "false", "null", also invalid identifiers.
const JAVA_KEYWORDS = ["abstract", "continue", "for", "new", "switch",
  "assert", "default", "goto", "package", "synchronized",
  "boolean", "do", "if", "private", "this", "break", "double",
  "implements", "protected", "throw", "byte", "else", "import",
  "public", "throws", "case", "enum", "instanceof", "return",
  "transient", "catch", "extends", "int", "short", "try", "char",
  "final", "interface", "static", "void", "class", "finally", "long",
  "strictfp", "volatile", "const*", "float", "native", "super", "while", "true", "false", "null"];

export type TrajectoryNameIssueTypes = {
    Empty: {kind: "Empty"},
    Exists: {kind: "Exists", name: string},
    StartsWithNumber: {kind: "StartsWithNumber", name: string},
    InvalidCharacter: {kind: "InvalidCharacter", name: string, character: string[]},
    IsJavaKeyword: {kind: "IsJavaKeyword", name: string}
}
export type TrajectoryNameIssues = keyof TrajectoryNameIssueTypes;
export type TrajectoryNameIssue = TrajectoryNameIssueTypes[keyof TrajectoryNameIssueTypes] & {uiMessage:string, codegenMessage:string};
export const TrajectoryNameErrorMessages = {
    Empty: (_issue)=>
        [`Empty`
        ,`This error should never appear in generated code. Tell the developers.`],
    Exists: ({name})=>
        [`Exists`,
         `This error should never appear in generated code. Tell the developers.`],
    StartsWithNumber: ({name})=>
        [`Can't start with 0-9`
        ,`Rename it in the Choreo app to fix this error.`],
    InvalidCharacter: ({name, character})=>
        
        [`Can't use ${character.map(c=>`${c.replace(" ", "[space]")}`).join(" ")}.`
        ,`Rename it in the Choreo app to fix this error.`],
    IsJavaKeyword: ({name})=>[`Can't be Java keyword`
        ,`Rename it in the Choreo app to fix this error.`],
} as const satisfies {[I in TrajectoryNameIssues]: (issue: TrajectoryNameIssueTypes[I])=>
    [string, //UI and codegen message
    string]} // codegen-only message]}
export function internalIsValidTrajectoryName(name: string, existingNames?: string[]): TrajectoryNameIssueTypes[TrajectoryNameIssues] | undefined {
  if (name.length === 0) return {kind: "Empty"};
  if (existingNames !== undefined && existingNames.includes(name)) return {kind: "Exists", name};
  if (name.at(0)?.match("[0-9]")) return {kind: "StartsWithNumber", name};
  // Get a deduplicated list of invalid characters.
  // deduplication for string arrays in https://stackoverflow.com/a/9229821
  var alreadyFlaggedCharacters : Record<string, boolean> = {};
  const invalidCharacters = name
    .matchAll(RegExp("[^A-z0-9_]", "g"))
    .map(match=>match[0])
    .filter(function(item) {
        return alreadyFlaggedCharacters.hasOwnProperty(item) ? false : (alreadyFlaggedCharacters[item] = true);
    })
    .toArray();
  
  if (invalidCharacters.length > 0) {
    return {kind: "InvalidCharacter", name, character: invalidCharacters};
  }
  if (JAVA_KEYWORDS.includes(name)) return {kind: "IsJavaKeyword", name};
}
export function isValidTrajectoryName(name: string, existingNames?: string[]) : TrajectoryNameIssue | undefined {
    const problem = internalIsValidTrajectoryName(name, existingNames);
    if (problem === undefined) return undefined;
    const messageGetter = TrajectoryNameErrorMessages[problem.kind] as (issue: typeof problem) => [string, string];
    const messages = messageGetter(problem);
    return {
        ...problem,
        uiMessage: messages[0],
        codegenMessage: messages[1]
    }
}

function testTrajectoryNameValidators() : boolean {
  const OK_TEST_CASES = ["test", "NewPath"]
  const ISSUE_TEST_CASES = {
    Empty: [""],
    StartsWithNumber: [], // TODO
    InvalidCharacter: ["New Path"], // TODO
    IsJavaKeyword: JAVA_KEYWORDS,
    Exists: OK_TEST_CASES
  } as const satisfies {[I in TrajectoryNameIssues]: string[]}
  return Object.entries(ISSUE_TEST_CASES).every(([issueType, names])=>
    names.map((name)=>{
        if (issueType as TrajectoryNameIssues === "Exists") {
            // Expect failure because the name is already in use.
            return isValidTrajectoryName(name, OK_TEST_CASES);
        } else {
            // Skip in-use checks and expect the name to be otherwise invalid.
            return isValidTrajectoryName(name);
        }})
        .every(issue=>issue !== undefined && issue.kind===issueType)
  ) && OK_TEST_CASES.map((name)=>isValidTrajectoryName(name)).every(issue=>issue===undefined);
}
