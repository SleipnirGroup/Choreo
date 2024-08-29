
#![allow(clippy::uninlined_format_args, clippy::or_fun_call, clippy::single_char_pattern)]

use nu_ansi_term::{Style, Color};
use tracing::{Level, field::Visit};

enum Locations {
    Frontend,
    Scripting,
    Native
}

#[derive(Default)]
struct MetaVisitor {
    pub line_num: Option<String>,
    pub file_path: Option<String>,
    pub source: Option<String>,
    pub thread: Option<String>,
    pub message: String,
}
impl Visit for MetaVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        match field.name() {
            "line" => self.line_num = Some(format!("{:?}", value)),
            "file" => self.file_path = Some(format!("{:?}", value)),
            "source" => self.source = Some(format!("{:?}", value)),
            "thread" => self.thread = Some(format!("{:?}", value)),
            "message" => self.message = format!("{:?}", value),
            _ => (),
        }
    }
}
impl MetaVisitor {
    pub fn file_path(&self) -> Option<&str> {
        self.file_path.as_deref()
    }
    pub fn source(&self) -> Option<&str> {
        self.source.as_deref()
    }
    pub fn thread(&self) -> Option<&str> {
        self.thread.as_deref()
    }
    pub fn message(&self) -> String {
        self.message.clone().replace('"', "")
    }
}

pub struct PrettyFormatter;

impl<S, N> tracing_subscriber::fmt::FormatEvent<S, N> for PrettyFormatter
where
    S: tracing::Subscriber + for<'a> tracing_subscriber::registry::LookupSpan<'a>,
    N: for<'a> tracing_subscriber::fmt::FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        _ctx: &tracing_subscriber::fmt::FmtContext<'_, S, N>,
        mut writer: tracing_subscriber::fmt::format::Writer<'_>,
        event: &tracing::Event<'_>,
    ) -> core::fmt::Result {
        let meta = event.metadata();

        let mut visitor = MetaVisitor::default();
        event.record(&mut visitor);

        let loc = match visitor.source() {
            Some("scripting") => Locations::Scripting,
            Some("frontend") => Locations::Frontend,
            _ => Locations::Native,
        };

        write!(&mut writer, "  ")?;

        let style = match *meta.level() {
            Level::TRACE => Style::new().fg(Color::Purple),
            Level::DEBUG => Style::new().fg(Color::Blue),
            Level::INFO => Style::new().fg(Color::Green),
            Level::WARN => Style::new().fg(Color::Yellow),
            Level::ERROR => Style::new().fg(Color::Red),
            // _ => return Ok(()),
        };

        write!(writer, "{} ", style.paint(meta.level().to_string()))?;

        let target_style = style.bold();

        let target = match loc {
            Locations::Frontend => "enoki::frontend",
            Locations::Scripting => "enoki::scripting",
            Locations::Native => meta.target(),
        };

        write!(
            writer,
            "{}{}{}:",
            target_style.prefix(),
            target,
            target_style.infix(style),
        )?;

        writer.write_char(' ')?;

        write!(writer, "{}", style.paint(visitor.message()))?;
        writer.write_char('\n')?;

        let dimmed = Style::new().dimmed().italic();

        let thread = match loc {
            Locations::Frontend => "js-main".to_owned(),
            Locations::Scripting => visitor.thread().unwrap_or("unknown").to_owned(),
            Locations::Native => std::thread::current().name().unwrap_or("unknown").to_owned(),
        };

        write!(writer, "    {} ", dimmed.paint("at"))?;

        //write file and line number
        write!(
            writer,
            "{}:{}",
            visitor.file_path()
                .unwrap_or(meta.file()
                .unwrap_or("unknown"))
                .to_owned()
                .replace("\"", ""),
            visitor.line_num.unwrap_or_else(|| {
                meta.line().map_or_else(|| "-1".to_owned(), |l| l.to_string())
            }).replace("\"", "")
        )?;

        write!(writer, " {} {}", dimmed.paint("on"), thread)?;

        writer.write_char('\n')?;

        Ok(())
    }
}

fn fill_string(left_aligned: bool, width: usize, mut s: String) -> String {
    if s.len() > width {
        return s;
    }
    if left_aligned {
        s.extend(std::iter::repeat(' ').take(width - s.len()));
    } else {
        let spaces = std::iter::repeat(' ').take(width - s.len());
        s.insert_str(0, &spaces.collect::<String>());
    }
    s
}


pub struct CompactFormatter;

impl<S, N> tracing_subscriber::fmt::FormatEvent<S, N> for CompactFormatter
where
    S: tracing::Subscriber + for<'a> tracing_subscriber::registry::LookupSpan<'a>,
    N: for<'a> tracing_subscriber::fmt::FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        _ctx: &tracing_subscriber::fmt::FmtContext<'_, S, N>,
        mut writer: tracing_subscriber::fmt::format::Writer<'_>,
        event: &tracing::Event<'_>,
    ) -> core::fmt::Result {
        let meta = event.metadata();

        let mut visitor = MetaVisitor::default();
        event.record(&mut visitor);

        let loc = match visitor.source() {
            Some("scripting") => Locations::Scripting,
            Some("frontend") => Locations::Frontend,
            _ => Locations::Native,
        };

        let level_str = match *meta.level() {
            Level::TRACE => "TRACE",
            Level::DEBUG => "DEBUG",
            Level::INFO => "INFO ",
            Level::WARN => "WARN ",
            Level::ERROR => "ERROR",
        };

        let now_str = format!(
            "{:02}:{:02}:{:02}.{:03}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("Time went backwards")
                .as_secs() % 86400 / 3600,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("Time went backwards")
                .as_secs() % 3600 / 60,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("Time went backwards")
                .as_secs() % 60,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("Time went backwards")
                .subsec_millis()
        );

        let target = match loc {
            Locations::Frontend => "enoki::frontend",
            Locations::Scripting => "enoki::scripting",
            Locations::Native => meta.target(),
        };

        let message = visitor.message();

        let file = visitor.file_path().unwrap_or(meta.file().unwrap_or("unknown")).to_owned();
        let line = visitor.line_num.unwrap_or_else(|| {
            meta.line().map_or_else(|| "-1".to_owned(), |l| l.to_string())
        });

        let file_line = format!("{}:{}", file, line);

        //write LEVEL TIME TARGET FILE:LINE MESSAGE

        write!(writer, "{}| ", level_str)?;
        write!(writer, "{}| ", now_str)?;
        write!(writer, "{}| ", fill_string(true, 22, target.to_string()))?;
        write!(writer, "{}| ", fill_string(true, 16, file_line))?;
        write!(writer, "{}", message)?;
        writer.write_char('\n')?;

        Ok(())
    }
}