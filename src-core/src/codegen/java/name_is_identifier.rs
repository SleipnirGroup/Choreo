
// const JAVA_KEYWORDS: [&str; 53] = [
//   "abstract",
//   "continue",
//   "for",
//   "new",
//   "switch",
//   "assert",
//   "default",
//   "goto",
//   "package",
//   "synchronized",
//   "boolean",
//   "do",
//   "if",
//   "private",
//   "this",
//   "break",
//   "double",
//   "implements",
//   "protected",
//   "throw",
//   "byte",
//   "else",
//   "import",
//   "public",
//   "throws",
//   "case",
//   "enum",
//   "instanceof",
//   "return",
//   "transient",
//   "catch",
//   "extends",
//   "int",
//   "short",
//   "try",
//   "char",
//   "final",
//   "interface",
//   "static",
//   "void",
//   "class",
//   "finally",
//   "long",
//   "strictfp",
//   "volatile",
//   "const*",
//   "float",
//   "native",
//   "super",
//   "while",
//   "true",
//   "false",
//   "null"
// ];

// const PYTHON_KEYWORDS: [&str; 35] = [
//   "False",
//   "class",
//   "from",
//   "or",
//   "None",
//   "continue",
//   "global",
//   "pass",
//   "True",
//   "def",
//   "if",
//   "raise",
//   "and",
//   "del",
//   "import",
//   "return",
//   "as",
//   "elif",
//   "in",
//   "try",
//   "assert",
//   "else",
//   "is",
//   "while",
//   "async",
//   "except",
//   "lambda",
//   "with",
//   "await",
//   "finally",
//   "nonlocal",
//   "yield",
//   "break",
//   "for",
//   "not"
// ];

// const SHOULD_NOT_APPEAR_CODEGEN: &str = "This error should never appear in generated code. Tell the developers.";
// const RENAME: &str = "Rename it in the Choreo app to fix this error.";

// pub enum NameIssue {
//   Empty,
//   Exists(String),
//   InvalidStartChar(String),
//   InvalidChar{ name: String, character: Vec<String> },
//   IsJavaKeyword(String),
//   IsPythonKeyword(String),
//   IsMathJsDefined(String)
// }
// impl NameIssue {
//   fn ui_msg(&self) -> String {
//     match &self {
//         NameIssue::Empty => String::from("Empty"),
//         NameIssue::Exists(_) => String::from(SHOULD_NOT_APPEAR_CODEGEN),
//         NameIssue::InvalidStartChar(_) => {
//           String::from("Must start with letter")
//         },
//         NameIssue::InvalidChar { name, character } => {
//           let invalid_chars: String = 
//             character.iter()
//               .map(|c| c.replace(" ", "[space]"))
//               .collect::<Vec<String>>()
//               .join(" ");
//           format!(
//             "Can only use letters, 0-9, and _. Can't use"
//           )
//         },
//         NameIssue::IsJavaKeyword(name) => todo!(),
//         NameIssue::IsPythonKeyword(name) => todo!(),
//         NameIssue::IsMathJsDefined(name) => todo!(),
//     }
//   }

//   fn codegen_msg(&self) -> String {
//     String::from("")
//   }
// }

// pub fn name_is_identifier(name: &str) -> Option<NamingIssue> {
//     if name.is_empty() {
//         return Some(NamingIssue::Empty);
//     }

//     let first_char = name.chars().next().unwrap();
//     if !first_char.is_ascii_alphabetic() {
//         return Some(NamingIssue::InvalidStartChar(name.to_string()));
//     }

//     let mut invalid_chars = vec![];
//     for c in name.chars() {
//         if !c.is_ascii_alphanumeric() && c != '_' {
//             if !invalid_chars.contains(&c.to_string()) {
//                 invalid_chars.push(c.to_string());
//             }
//         }
//     }
//     if !invalid_chars.is_empty() {
//         return Some(NamingIssue::InvalidChar {
//             name: name.to_string(),
//             character: invalid_chars,
//         });
//     }

//     if JAVA_KEYWORDS.contains(&name) {
//         return Some(NamingIssue::IsJavaKeyword(name.to_string()));
//     }
//     if PYTHON_KEYWORDS.contains(&name) {
//         return Some(NamingIssue::IsPythonKeyword(name.to_string()));
//     }

//     None
// }