#[derive(Debug, Clone)]
pub struct CliError {
    pub code: &'static str,
    pub message: String,
    pub suggestions: Vec<String>,
}

impl CliError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            suggestions: Vec::new(),
        }
    }

    pub fn with_suggestions(mut self, suggestions: Vec<&str>) -> Self {
        self.suggestions = suggestions.into_iter().map(str::to_string).collect();
        self
    }

    pub fn exit_code(&self) -> u8 {
        1
    }

    pub fn print_and_exit(self) -> ! {
        eprintln!("{}", self.message);
        std::process::exit(self.exit_code().into());
    }

    pub fn to_json(&self) -> String {
        serde_json::json!({
            "error": {
                "code": self.code,
                "message": self.message,
                "suggestions": self.suggestions,
            }
        })
        .to_string()
    }
}

impl std::fmt::Display for CliError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CliError {}

pub type Result<T> = std::result::Result<T, CliError>;
