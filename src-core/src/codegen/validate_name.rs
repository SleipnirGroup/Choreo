use regex::Regex;
use std::sync::LazyLock;

const JAVA_KEYWORDS: [&str; 53] = [
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
    "null",
];

const PYTHON_KEYWORDS: [&str; 35] = [
    "False", "class", "from", "or", "None", "continue", "global", "pass", "True", "def", "if",
    "raise", "and", "del", "import", "return", "as", "elif", "in", "try", "assert", "else", "is",
    "while", "async", "except", "lambda", "with", "await", "finally", "nonlocal", "yield", "break",
    "for", "not",
];

pub enum NameErr {
    Empty,
    Exists(String),
    InvalidStartChar(String),
    InvalidChar {
        name: String,
        character: Vec<String>,
    },
    IsJavaKeyword(String),
    IsPythonKeyword(String),
    IsMathJsDefined(String),
}

impl NameErr {
    pub fn ui_msg(&self) -> String {
        match &self {
            NameErr::Empty => String::from("Empty"),
            NameErr::Exists(_) => String::from("Exists"),
            NameErr::InvalidStartChar(_) => String::from("Must start with letter"),
            NameErr::InvalidChar { name: _, character } => {
                let invalid_chars: String = character
                    .iter()
                    .map(|c| c.replace(" ", "[space]"))
                    .collect::<Vec<String>>()
                    .join(" ");
                format!("Can only use letters, 0-9, and _. Can't use {invalid_chars}")
            }
            NameErr::IsJavaKeyword(_) => String::from("Can't be Java keyword"),
            NameErr::IsPythonKeyword(_) => String::from("Can't be Pava keyword"),
            NameErr::IsMathJsDefined(_) => String::from("Can't be predefined math term"),
        }
    }

    pub fn codegen_msg(&self) -> String {
        match &self {
            NameErr::Empty | NameErr::Exists(_) => String::from(
                "This error should never appear in generated code. Tell the developers.",
            ),
            _ => String::from("Rename it in the Choreo app to fix this error."),
        }
    }

    pub fn javadoc_comment(&self) -> String {
        format!(
            "/** ERROR: {}. {} */\n",
            &self.ui_msg(),
            &self.codegen_msg()
        )
    }
}

pub fn validate_name(name: &str) -> Result<(), NameErr> {
    static FIRST_CHAR_RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"[0-9_]").expect("Invalid regex"));
    static ALL_CHARS_RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"[^a-zA-Z0-9_]").expect("Invalid regex"));

    if name.is_empty() {
        return Err(NameErr::Empty);
    }
    if FIRST_CHAR_RE.is_match(&name[0..1]) {
        return Err(NameErr::InvalidStartChar(name.to_string()));
    }

    let mut already_flagged: Vec<&str> = vec![];
    let invalid_chars: Vec<String> = ALL_CHARS_RE
        .find_iter(name)
        .map(|mat| mat.as_str())
        .filter(|item| {
            if already_flagged.contains(item) {
                false
            } else {
                already_flagged.push(item);
                true
            }
        })
        .map(|s| s.to_string())
        .collect();

    if !invalid_chars.is_empty() {
        return Err(NameErr::InvalidChar {
            name: name.to_string(),
            character: invalid_chars,
        });
    }

    if JAVA_KEYWORDS.contains(&name) {
        return Err(NameErr::IsJavaKeyword(name.to_string()));
    }
    if PYTHON_KEYWORDS.contains(&name) {
        return Err(NameErr::IsPythonKeyword(name.to_string()));
    }

    Ok(())
}
