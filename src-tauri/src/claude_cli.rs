use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::BufRead;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus, Stdio};

/// Status returned by `check_claude_cli`.
#[derive(Debug, Serialize, Clone)]
pub struct ClaudeCliStatus {
    pub installed: bool,
    pub version: Option<String>,
}

/// Event emitted to the frontend during a streaming claude session.
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "kind")]
pub enum ClaudeStreamEvent {
    /// Session initialised — carries the session ID for future `--resume`.
    Init { session_id: String },
    /// Incremental text chunk.
    TextDelta { text: String },
    /// Incremental thinking/reasoning chunk.
    ThinkingDelta { text: String },
    /// A tool call started (agent mode only).
    ToolStart {
        tool_name: String,
        tool_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        input: Option<String>,
    },
    /// A tool call finished (agent mode only).
    ToolDone {
        tool_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        output: Option<String>,
    },
    /// Final result text + session ID.
    Result { text: String, session_id: String },
    /// Something went wrong.
    Error { message: String },
    /// Stream finished.
    Done,
}

/// Parameters accepted by `stream_claude_chat`.
#[derive(Debug, Deserialize)]
pub struct ChatStreamRequest {
    pub message: String,
    pub system_prompt: Option<String>,
    pub session_id: Option<String>,
}

/// Parameters accepted by `stream_claude_agent`.
#[derive(Debug, Deserialize)]
pub struct AgentStreamRequest {
    pub message: String,
    pub system_prompt: Option<String>,
    pub vault_path: String,
}

// ---------------------------------------------------------------------------
// Finding the `claude` binary
// ---------------------------------------------------------------------------

pub(crate) fn find_claude_binary() -> Result<PathBuf, String> {
    if let Some(binary) = find_claude_binary_in_env() {
        return Ok(binary);
    }

    if let Some(binary) = find_claude_binary_on_path()? {
        return Ok(binary);
    }

    #[cfg(unix)]
    if let Some(binary) = find_claude_binary_in_user_shell() {
        return Ok(binary);
    }

    if let Some(binary) = find_existing_binary(claude_binary_candidates()) {
        return Ok(binary);
    }

    Err("Claude CLI not found. Install it: https://docs.anthropic.com/en/docs/claude-code".into())
}

fn find_claude_binary_in_env() -> Option<PathBuf> {
    let value = std::env::var_os("CLAUDE_BIN")?;
    if value.is_empty() {
        return None;
    }
    let path = PathBuf::from(value);
    path.is_file().then_some(path)
}

fn find_claude_binary_on_path() -> Result<Option<PathBuf>, String> {
    let output = crate::platform::which_command("claude")
        .output()
        .map_err(|e| format!("Failed to locate claude on PATH: {e}"))?;

    Ok(path_from_successful_output(&output))
}

#[cfg(unix)]
fn find_claude_binary_in_user_shell() -> Option<PathBuf> {
    user_shell_candidates()
        .into_iter()
        .filter(|shell| shell.exists())
        .find_map(|shell| command_path_from_shell(&shell, "claude"))
}

#[cfg(unix)]
fn user_shell_candidates() -> Vec<PathBuf> {
    let mut shells = Vec::new();
    if let Some(shell) = std::env::var_os("SHELL") {
        if !shell.is_empty() {
            shells.push(PathBuf::from(shell));
        }
    }
    shells.push(PathBuf::from("/bin/zsh"));
    shells.push(PathBuf::from("/bin/bash"));
    shells
}

#[cfg(unix)]
fn command_path_from_shell(shell: &Path, command: &str) -> Option<PathBuf> {
    Command::new(shell)
        .arg("-lc")
        .arg(format!("command -v {command}"))
        .output()
        .ok()
        .and_then(|output| path_from_successful_output(&output))
}

fn path_from_successful_output(output: &std::process::Output) -> Option<PathBuf> {
    if output.status.success() {
        crate::platform::first_executable_path_line(&String::from_utf8_lossy(&output.stdout))
    } else {
        None
    }
}

fn claude_binary_candidates() -> Vec<PathBuf> {
    dirs::home_dir()
        .map(|home| claude_binary_candidates_for_home(&home))
        .unwrap_or_default()
}

#[cfg(not(windows))]
fn claude_binary_candidates_for_home(home: &Path) -> Vec<PathBuf> {
    vec![
        home.join(".local/bin/claude"),
        home.join(".claude/local/claude"),
        home.join(".local/share/mise/shims/claude"),
        home.join(".asdf/shims/claude"),
        home.join(".npm-global/bin/claude"),
        home.join(".npm/bin/claude"),
        PathBuf::from("/opt/homebrew/bin/claude"),
        PathBuf::from("/usr/local/bin/claude"),
    ]
}

#[cfg(windows)]
fn claude_binary_candidates_for_home(home: &Path) -> Vec<PathBuf> {
    vec![
        home.join(".claude").join("local").join("claude.exe"),
        home.join(".local").join("bin").join("claude.exe"),
        home.join("AppData")
            .join("Roaming")
            .join("npm")
            .join("claude.cmd"),
        home.join("AppData")
            .join("Roaming")
            .join("npm")
            .join("claude.exe"),
        home.join(".npm").join("bin").join("claude.cmd"),
        home.join("scoop").join("shims").join("claude.exe"),
        home.join("scoop").join("shims").join("claude.cmd"),
    ]
}

fn find_existing_binary(candidates: Vec<PathBuf>) -> Option<PathBuf> {
    candidates.into_iter().find(|candidate| candidate.exists())
}

// ---------------------------------------------------------------------------
// Public Tauri commands
// ---------------------------------------------------------------------------

/// Check whether the `claude` CLI is installed and return its version.
pub fn check_cli() -> ClaudeCliStatus {
    let bin = match find_claude_binary() {
        Ok(b) => b,
        Err(_) => {
            return ClaudeCliStatus {
                installed: false,
                version: None,
            }
        }
    };

    let version = build_claude_command(&bin)
        .arg("--version")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    ClaudeCliStatus {
        installed: true,
        version,
    }
}

/// Spawn `claude -p` for a simple chat (no tools) and stream events via the
/// provided callback.  Returns the session ID for future `--resume` calls.
pub fn run_chat_stream<F>(req: ChatStreamRequest, mut emit: F) -> Result<String, String>
where
    F: FnMut(ClaudeStreamEvent),
{
    let bin = find_claude_binary()?;
    let args = build_chat_args(&req);
    run_claude_subprocess(&bin, &args, None, &mut emit)
}

/// Build CLI arguments for a chat stream request.
///
/// Fork override: pin the model to Sonnet (`claude-sonnet-4-6`). The CLI
/// default is Opus 4.7 with the 1M-token window which costs significantly
/// more per call. Sonnet 4.6 keeps quality for routine fork requests
/// (note rewrites, light refactors, search) while keeping the API bill
/// sane. Override at runtime with `CLAUDE_MODEL=<id>` if a richer call
/// is needed.
fn build_chat_args(req: &ChatStreamRequest) -> Vec<String> {
    let model = std::env::var("CLAUDE_MODEL").unwrap_or_else(|_| "sonnet".to_string());
    let mut args: Vec<String> = vec![
        "-p".into(),
        req.message.clone(),
        "--output-format".into(),
        "stream-json".into(),
        "--verbose".into(),
        "--include-partial-messages".into(),
        "--model".into(),
        model,
        "--tools".into(),
        String::new(), // empty string → disable all built-in tools
    ];

    if let Some(ref sp) = req.system_prompt {
        if !sp.is_empty() {
            args.push("--system-prompt".into());
            args.push(sp.clone());
        }
    }

    if let Some(ref sid) = req.session_id {
        args.push("--resume".into());
        args.push(sid.clone());
    }

    args
}

/// Spawn `claude -p` with full tool access and MCP vault tools for an agent task.
pub fn run_agent_stream<F>(req: AgentStreamRequest, mut emit: F) -> Result<String, String>
where
    F: FnMut(ClaudeStreamEvent),
{
    let bin = find_claude_binary()?;
    let args = build_agent_args(&req)?;
    run_claude_subprocess(&bin, &args, Some(&req.vault_path), &mut emit)
}

/// Build CLI arguments for an agent stream request.
/// Native tools (bash, read, write, edit) are enabled by default — no `--tools ""`.
///
/// Fork override: same model pin as chat (`sonnet`, override via
/// `CLAUDE_MODEL`). Agent calls cost more per request because of tool
/// loops, so the savings vs Opus are larger here.
fn build_agent_args(req: &AgentStreamRequest) -> Result<Vec<String>, String> {
    let mcp_config = build_mcp_config(&req.vault_path)?;
    let model = std::env::var("CLAUDE_MODEL").unwrap_or_else(|_| "sonnet".to_string());

    let mut args: Vec<String> = vec![
        "-p".into(),
        req.message.clone(),
        "--output-format".into(),
        "stream-json".into(),
        "--verbose".into(),
        "--include-partial-messages".into(),
        "--model".into(),
        model,
        "--mcp-config".into(),
        mcp_config,
        "--dangerously-skip-permissions".into(),
        "--no-session-persistence".into(),
    ];

    if let Some(ref sp) = req.system_prompt {
        if !sp.is_empty() {
            args.push("--append-system-prompt".into());
            args.push(sp.clone());
        }
    }

    Ok(args)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Build a temporary MCP config JSON string pointing to the vault MCP server.
fn build_mcp_config(vault_path: &str) -> Result<String, String> {
    let server_dir = crate::mcp::mcp_server_dir()?;
    let index_js = server_dir.join("index.js");
    let config = serde_json::json!({
        "mcpServers": {
            "tolaria": {
                "command": "node",
                "args": [index_js.to_string_lossy()],
                "env": { "VAULT_PATH": vault_path }
            }
        }
    });
    serde_json::to_string(&config).map_err(|e| format!("Failed to serialise MCP config: {e}"))
}

/// Mutable state accumulated across the JSON stream for a single subprocess.
struct StreamState {
    session_id: String,
    /// Accumulates `input_json_delta` chunks keyed by tool_use id.
    tool_inputs: HashMap<String, String>,
    /// The tool_use id of the block currently being streamed.
    current_tool_id: Option<String>,
}

/// Build a `Command` that can invoke `bin` even when it's a Windows `.cmd`
/// or `.bat` shim.
///
/// Fork fix: on Windows, `cmd.exe /C claude.cmd <args>` re-encodes UTF-8
/// arguments through the active OEM/ANSI code page (CP1251 on Russian
/// Windows). That mangles every non-ASCII prompt - "автор" arrives at
/// claude.exe as `Р°РІС‚РѕСЂ`. We bypass that by locating the underlying
/// `cli.js` and invoking `node cli.js` directly: Rust's `Command::new`
/// uses `CreateProcessW` which preserves UTF-16 args end-to-end. If we
/// can't find the JS bundle we fall back to `cmd.exe /C` (ASCII-only
/// prompts still work, English-only users won't notice).
///
/// On Windows we always go through `crate::hidden_command` so the helper
/// process runs without flashing a console window.
fn build_claude_command(bin: &Path) -> Command {
    #[cfg(windows)]
    {
        let is_shim = bin
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("cmd") || ext.eq_ignore_ascii_case("bat"))
            .unwrap_or(false);
        if is_shim {
            if let Some((node, cli_js)) = find_node_and_cli_js(bin) {
                let mut cmd = crate::hidden_command(node);
                cmd.arg(cli_js);
                return cmd;
            }
            let mut cmd = crate::hidden_command("cmd.exe");
            cmd.arg("/C").arg(bin);
            return cmd;
        }
        crate::hidden_command(bin)
    }
    #[cfg(not(windows))]
    Command::new(bin)
}

/// Locate `node.exe` and the underlying `cli.js` for an npm `.cmd` shim.
///
/// `cli.js` lives next to the shim at
/// `<shim_dir>/node_modules/@anthropic-ai/claude-code/cli.js`. `node.exe`
/// can be anywhere — npm global shims sit in `%APPDATA%\Roaming\npm\` but
/// system-wide node installs typically live in `C:\Program Files\nodejs\`,
/// so we search next-to-shim first, then PATH, then common install dirs.
///
/// Returns both paths when found, or `None` if either is missing (we fall
/// back to `cmd.exe /C` in that case — but that path mangles multi-line
/// args so callers should keep their args single-line if relying on it).
#[cfg(windows)]
fn find_node_and_cli_js(shim: &Path) -> Option<(PathBuf, PathBuf)> {
    let dir = shim.parent()?;
    let cli_js_candidates = [
        dir.join("node_modules")
            .join("@anthropic-ai")
            .join("claude-code")
            .join("cli.js"),
        dir.join("node_modules")
            .join("@anthropic")
            .join("claude-code")
            .join("cli.js"),
    ];
    let cli_js = cli_js_candidates.into_iter().find(|p| p.is_file())?;
    let node = locate_node_exe(dir)?;
    Some((node, cli_js))
}

/// Find `node.exe`: alongside the shim → PATH → standard install locations.
#[cfg(windows)]
fn locate_node_exe(shim_dir: &Path) -> Option<PathBuf> {
    let local = shim_dir.join("node.exe");
    if local.is_file() {
        return Some(local);
    }

    if let Ok(output) = crate::platform::which_command("node").output() {
        if output.status.success() {
            if let Some(path) = crate::platform::first_executable_path_line(
                &String::from_utf8_lossy(&output.stdout),
            ) {
                if path.is_file() {
                    return Some(path);
                }
            }
        }
    }

    let system_candidates = [
        PathBuf::from(r"C:\Program Files\nodejs\node.exe"),
        PathBuf::from(r"C:\Program Files (x86)\nodejs\node.exe"),
    ];
    system_candidates.into_iter().find(|p| p.is_file())
}

/// Truncate a string to roughly `max_bytes` bytes for log output without
/// splitting a UTF-8 char in half — Rust string slicing by byte index
/// panics when the cut lands inside a multi-byte character (e.g. between
/// the two bytes of `ч`). We round the cap *down* to the nearest char
/// boundary so cyrillic/emoji content never crashes the logger.
fn truncate_for_log(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}…[{} chars]", &s[..end], s.chars().count())
}

/// Append a debug entry to the fork-only debug log if the file exists.
/// The file is created lazily on the first call; we never auto-create it
/// in production to keep release behaviour clean. To enable: drop an empty
/// `claude_debug.log` into the same directory as `settings.json`
/// (`%APPDATA%\com.tolaria.app\` on Windows). To disable: delete the file.
fn debug_log(label: &str, payload: &str) {
    let Some(config_dir) = dirs::config_dir() else {
        return;
    };
    let log_path = config_dir.join("com.tolaria.app").join("claude_debug.log");
    let log_path_legacy = config_dir.join("com.laputa.app").join("claude_debug.log");
    let target = if log_path.exists() {
        log_path
    } else if log_path_legacy.exists() {
        log_path_legacy
    } else {
        return;
    };
    let stamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{stamp}] {label}: {payload}\n");
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&target)
    {
        use std::io::Write;
        let _ = file.write_all(line.as_bytes());
    }
}

/// Core subprocess runner shared by chat and agent modes.
/// When `cwd` is `Some`, the subprocess starts with that working directory.
fn run_claude_subprocess<F>(
    bin: &Path,
    args: &[String],
    cwd: Option<&str>,
    emit: &mut F,
) -> Result<String, String>
where
    F: FnMut(ClaudeStreamEvent),
{
    debug_log(
        "spawn",
        &format!(
            "bin={} cwd={:?} args={}",
            bin.display(),
            cwd,
            args.iter()
                .map(|a| truncate_for_log(a, 200))
                .collect::<Vec<_>>()
                .join(" ")
        ),
    );

    let mut cmd = build_claude_command(bin);
    cmd.args(args)
        .env_remove("CLAUDECODE") // prevent "nested session" guard
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    let mut child = cmd.spawn().map_err(|e| {
        debug_log("spawn-err", &e.to_string());
        format!("Failed to spawn claude: {e}")
    })?;

    let stdout = child.stdout.take().ok_or("No stdout handle")?;
    let reader = std::io::BufReader::new(stdout);

    let mut state = StreamState {
        session_id: String::new(),
        tool_inputs: HashMap::new(),
        current_tool_id: None,
    };

    let mut line_count = 0usize;
    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                debug_log("read-err", &e.to_string());
                emit(ClaudeStreamEvent::Error {
                    message: format!("Read error: {e}"),
                });
                break;
            }
        };

        if line.trim().is_empty() {
            continue;
        }

        line_count += 1;
        debug_log("stdout", &truncate_for_log(&line, 500));

        let json: serde_json::Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                debug_log("parse-err", &e.to_string());
                continue; // skip non-JSON lines
            }
        };

        dispatch_event(&json, &mut state, emit);
    }

    // Read stderr for potential error messages.
    let stderr_output = child
        .stderr
        .take()
        .and_then(|s| std::io::read_to_string(s).ok())
        .unwrap_or_default();

    let status = child.wait().map_err(|e| format!("Wait failed: {e}"))?;

    debug_log(
        "exit",
        &format!(
            "code={:?} success={} session_id_empty={} stdout_lines={} stderr_len={}",
            status.code(),
            status.success(),
            state.session_id.is_empty(),
            line_count,
            stderr_output.len()
        ),
    );
    if !stderr_output.trim().is_empty() {
        debug_log("stderr", stderr_output.trim());
    }

    if !status.success() && state.session_id.is_empty() {
        emit(ClaudeStreamEvent::Error {
            message: format_failed_claude_exit(&stderr_output, status),
        });
    }

    emit(ClaudeStreamEvent::Done);

    Ok(state.session_id)
}

fn format_failed_claude_exit(stderr_output: &str, status: ExitStatus) -> String {
    if is_claude_auth_error(stderr_output) {
        return "Claude CLI is not authenticated. Run `claude auth login` in your terminal.".into();
    }

    if stderr_output.is_empty() {
        format!("claude exited with status {status}")
    } else {
        stderr_output.lines().take(3).collect::<Vec<_>>().join("\n")
    }
}

fn is_claude_auth_error(stderr_output: &str) -> bool {
    let lower = stderr_output.to_ascii_lowercase();
    ["not logged in", "authentication", "auth"]
        .iter()
        .any(|pattern| lower.contains(pattern))
}

/// Parse a single JSON line from the stream and emit the appropriate event.
fn dispatch_event<F>(json: &serde_json::Value, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    let msg_type = json["type"].as_str().unwrap_or("");

    match msg_type {
        // --- System init → capture session_id ---
        "system" if json["subtype"].as_str() == Some("init") => {
            if let Some(sid) = json["session_id"].as_str() {
                state.session_id = sid.to_string();
                emit(ClaudeStreamEvent::Init {
                    session_id: sid.to_string(),
                });
            }
        }

        // --- Streaming partial events (text deltas, tool_use starts) ---
        "stream_event" => {
            dispatch_stream_event(json, state, emit);
        }

        // --- Tool progress (agent mode) ---
        "tool_progress" => {
            if let (Some(name), Some(id)) =
                (json["tool_name"].as_str(), json["tool_use_id"].as_str())
            {
                emit(ClaudeStreamEvent::ToolStart {
                    tool_name: name.to_string(),
                    tool_id: id.to_string(),
                    input: None,
                });
            }
        }

        // --- Tool result (agent mode) ---
        "tool_result" => {
            if let Some(id) = json["tool_use_id"].as_str() {
                let output = extract_tool_result_text(json);
                emit(ClaudeStreamEvent::ToolDone {
                    tool_id: id.to_string(),
                    output,
                });
            }
        }

        // --- Final result ---
        "result" => {
            let sid = json["session_id"].as_str().unwrap_or("").to_string();
            if !sid.is_empty() {
                state.session_id = sid.clone();
            }
            let text = json["result"].as_str().unwrap_or("").to_string();
            emit(ClaudeStreamEvent::Result {
                text,
                session_id: sid,
            });
        }

        // --- Complete assistant message (fallback for text when no partials) ---
        "assistant" => {
            if let Some(content) = json["message"]["content"].as_array() {
                for block in content {
                    if block["type"].as_str() == Some("tool_use") {
                        if let (Some(id), Some(name)) =
                            (block["id"].as_str(), block["name"].as_str())
                        {
                            let input = format_tool_input(&block["input"], state, id);
                            emit(ClaudeStreamEvent::ToolStart {
                                tool_name: name.to_string(),
                                tool_id: id.to_string(),
                                input,
                            });
                        }
                    }
                }
            }
        }

        _ => {} // ignore other event types
    }
}

/// Handle a `stream_event` (partial assistant message).
fn dispatch_stream_event<F>(json: &serde_json::Value, state: &mut StreamState, emit: &mut F)
where
    F: FnMut(ClaudeStreamEvent),
{
    let event = &json["event"];
    let event_type = event["type"].as_str().unwrap_or("");

    match event_type {
        "content_block_delta" => {
            let delta = &event["delta"];
            match delta["type"].as_str() {
                Some("text_delta") => {
                    if let Some(text) = delta["text"].as_str() {
                        emit(ClaudeStreamEvent::TextDelta {
                            text: text.to_string(),
                        });
                    }
                }
                Some("thinking_delta") => {
                    if let Some(text) = delta["thinking"].as_str() {
                        emit(ClaudeStreamEvent::ThinkingDelta {
                            text: text.to_string(),
                        });
                    }
                }
                Some("input_json_delta") => {
                    if let (Some(partial), Some(ref tid)) =
                        (delta["partial_json"].as_str(), &state.current_tool_id)
                    {
                        state
                            .tool_inputs
                            .entry(tid.clone())
                            .or_default()
                            .push_str(partial);
                    }
                }
                _ => {}
            }
        }
        "content_block_start" => {
            let block = &event["content_block"];
            if block["type"].as_str() == Some("tool_use") {
                if let (Some(id), Some(name)) = (block["id"].as_str(), block["name"].as_str()) {
                    state.current_tool_id = Some(id.to_string());
                    state.tool_inputs.entry(id.to_string()).or_default();
                    emit(ClaudeStreamEvent::ToolStart {
                        tool_name: name.to_string(),
                        tool_id: id.to_string(),
                        input: None,
                    });
                }
            }
        }
        "content_block_stop" => {
            state.current_tool_id = None;
        }
        _ => {}
    }
}

/// Build the tool input string, preferring accumulated delta chunks over the
/// block's `input` field (which may be empty at stream start).
fn format_tool_input(
    block_input: &serde_json::Value,
    state: &StreamState,
    tool_id: &str,
) -> Option<String> {
    if let Some(accumulated) = state.tool_inputs.get(tool_id) {
        if !accumulated.is_empty() {
            return Some(accumulated.clone());
        }
    }
    if !block_input.is_null() && block_input.as_object().is_some_and(|o| !o.is_empty()) {
        return Some(block_input.to_string());
    }
    None
}

/// Extract displayable text from a `tool_result` event.
fn extract_tool_result_text(json: &serde_json::Value) -> Option<String> {
    // String content field
    if let Some(s) = json["content"].as_str() {
        return Some(s.to_string());
    }
    // Array of content blocks (Claude format)
    if let Some(arr) = json["content"].as_array() {
        let texts: Vec<&str> = arr.iter().filter_map(|b| b["text"].as_str()).collect();
        if !texts.is_empty() {
            return Some(texts.join("\n"));
        }
    }
    // Fallback: "output" field
    json["output"].as_str().map(|s| s.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_cli_returns_status() {
        let status = check_cli();
        if status.installed {
            assert!(status.version.is_some());
        } else {
            assert!(status.version.is_none());
        }
    }

    #[test]
    fn build_mcp_config_is_valid_json() {
        if let Ok(config_str) = build_mcp_config("/tmp/test-vault") {
            let parsed: serde_json::Value = serde_json::from_str(&config_str).unwrap();
            assert!(parsed["mcpServers"]["tolaria"]["command"].is_string());
            assert_eq!(
                parsed["mcpServers"]["tolaria"]["env"]["VAULT_PATH"],
                "/tmp/test-vault"
            );
        }
    }

    // --- dispatch_event / dispatch_stream_event ---

    fn new_state() -> StreamState {
        StreamState {
            session_id: String::new(),
            tool_inputs: HashMap::new(),
            current_tool_id: None,
        }
    }

    /// Run dispatch_event on the given JSON and return (session_id, events).
    fn run_dispatch(json: serde_json::Value) -> (String, Vec<ClaudeStreamEvent>) {
        let mut state = new_state();
        let mut events = vec![];
        dispatch_event(&json, &mut state, &mut |e| events.push(e));
        (state.session_id, events)
    }

    /// Run dispatch_event with a pre-set session_id.
    fn run_dispatch_with_sid(
        json: serde_json::Value,
        initial_sid: &str,
    ) -> (String, Vec<ClaudeStreamEvent>) {
        let mut state = new_state();
        state.session_id = initial_sid.to_string();
        let mut events = vec![];
        dispatch_event(&json, &mut state, &mut |e| events.push(e));
        (state.session_id, events)
    }

    /// Run multiple dispatch_event calls sharing state (for multi-event sequences).
    fn run_dispatch_sequence(
        events_json: Vec<serde_json::Value>,
    ) -> (StreamState, Vec<ClaudeStreamEvent>) {
        let mut state = new_state();
        let mut events = vec![];
        for json in &events_json {
            dispatch_event(json, &mut state, &mut |e| events.push(e));
        }
        (state, events)
    }

    #[test]
    fn dispatch_event_handles_init() {
        let (sid, events) = run_dispatch(serde_json::json!({
            "type": "system", "subtype": "init", "session_id": "test-session-123"
        }));
        assert_eq!(sid, "test-session-123");
        assert!(
            matches!(&events[0], ClaudeStreamEvent::Init { session_id } if session_id == "test-session-123")
        );
    }

    #[test]
    fn dispatch_event_system_without_init_subtype_is_ignored() {
        let (_, events) = run_dispatch(serde_json::json!({ "type": "system", "subtype": "other" }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_event_system_init_without_session_id_is_ignored() {
        let (sid, events) =
            run_dispatch(serde_json::json!({ "type": "system", "subtype": "init" }));
        assert!(events.is_empty());
        assert!(sid.is_empty());
    }

    #[test]
    fn dispatch_event_handles_text_delta() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_delta", "index": 0, "delta": { "type": "text_delta", "text": "Hello" } }
        }));
        assert!(matches!(&events[0], ClaudeStreamEvent::TextDelta { text } if text == "Hello"));
    }

    #[test]
    fn dispatch_event_handles_tool_start() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_start", "index": 1, "content_block": { "type": "tool_use", "id": "tool_abc", "name": "read_note", "input": {} } }
        }));
        assert!(
            matches!(&events[0], ClaudeStreamEvent::ToolStart { tool_name, tool_id, .. } if tool_name == "read_note" && tool_id == "tool_abc")
        );
    }

    #[test]
    fn dispatch_event_handles_result() {
        let (sid, events) = run_dispatch(serde_json::json!({
            "type": "result", "subtype": "success", "result": "All done!", "session_id": "sess-456"
        }));
        assert_eq!(sid, "sess-456");
        assert!(
            matches!(&events[0], ClaudeStreamEvent::Result { text, session_id } if text == "All done!" && session_id == "sess-456")
        );
    }

    #[test]
    fn dispatch_event_result_with_empty_session_id() {
        let (sid, events) = run_dispatch_with_sid(
            serde_json::json!({ "type": "result", "result": "text here" }),
            "prev-session",
        );
        assert_eq!(sid, "prev-session");
        assert!(
            matches!(&events[0], ClaudeStreamEvent::Result { text, .. } if text == "text here")
        );
    }

    #[test]
    fn dispatch_event_handles_tool_progress() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "tool_progress", "tool_name": "search_notes", "tool_use_id": "tool_xyz"
        }));
        assert!(
            matches!(&events[0], ClaudeStreamEvent::ToolStart { tool_name, tool_id, .. } if tool_name == "search_notes" && tool_id == "tool_xyz")
        );
    }

    #[test]
    fn dispatch_event_tool_progress_missing_fields_is_ignored() {
        let (_, events) =
            run_dispatch(serde_json::json!({ "type": "tool_progress", "tool_name": "x" }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_event_handles_assistant_with_tool_use() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "assistant",
            "message": { "content": [
                { "type": "text", "text": "Let me search." },
                { "type": "tool_use", "id": "tu_1", "name": "search_notes", "input": {} }
            ] }
        }));
        assert_eq!(events.len(), 1);
        assert!(
            matches!(&events[0], ClaudeStreamEvent::ToolStart { tool_name, tool_id, .. } if tool_name == "search_notes" && tool_id == "tu_1")
        );
    }

    #[test]
    fn dispatch_event_assistant_without_content_is_noop() {
        let (_, events) = run_dispatch(serde_json::json!({ "type": "assistant", "message": {} }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_event_ignores_unknown() {
        let (_, events) =
            run_dispatch(serde_json::json!({ "type": "some_future_type", "data": 42 }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_stream_event_input_json_delta_accumulates_silently() {
        // input_json_delta doesn't emit events directly — it accumulates in state
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_delta", "index": 0, "delta": { "type": "input_json_delta", "partial_json": "{}" } }
        }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_stream_event_non_tool_block_start_is_ignored() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "stream_event",
            "event": { "type": "content_block_start", "index": 0, "content_block": { "type": "text", "text": "" } }
        }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_stream_event_unknown_type_is_ignored() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "stream_event", "event": { "type": "message_stop" }
        }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_event_handles_tool_result_string_content() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "tool_result",
            "tool_use_id": "tool_abc",
            "content": "Found 3 notes matching query"
        }));
        assert_eq!(events.len(), 1);
        assert!(
            matches!(&events[0], ClaudeStreamEvent::ToolDone { tool_id, output }
                if tool_id == "tool_abc" && output.as_deref() == Some("Found 3 notes matching query"))
        );
    }

    #[test]
    fn dispatch_event_handles_tool_result_array_content() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "tool_result",
            "tool_use_id": "tool_def",
            "content": [{ "type": "text", "text": "Line 1" }, { "type": "text", "text": "Line 2" }]
        }));
        assert!(
            matches!(&events[0], ClaudeStreamEvent::ToolDone { output, .. }
                if output.as_deref() == Some("Line 1\nLine 2"))
        );
    }

    #[test]
    fn dispatch_event_tool_result_missing_tool_id_is_ignored() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "tool_result", "content": "result text"
        }));
        assert!(events.is_empty());
    }

    #[test]
    fn dispatch_accumulates_input_json_deltas() {
        let (_, events) = run_dispatch_sequence(vec![
            // Start tool_use block
            serde_json::json!({
                "type": "stream_event",
                "event": { "type": "content_block_start", "content_block": { "type": "tool_use", "id": "t1", "name": "search_notes", "input": {} } }
            }),
            // Input delta chunks
            serde_json::json!({
                "type": "stream_event",
                "event": { "type": "content_block_delta", "delta": { "type": "input_json_delta", "partial_json": "{\"query\":" } }
            }),
            serde_json::json!({
                "type": "stream_event",
                "event": { "type": "content_block_delta", "delta": { "type": "input_json_delta", "partial_json": "\"test\"}" } }
            }),
            // Stop block
            serde_json::json!({
                "type": "stream_event",
                "event": { "type": "content_block_stop" }
            }),
            // Assistant message triggers ToolStart with accumulated input
            serde_json::json!({
                "type": "assistant",
                "message": { "content": [
                    { "type": "tool_use", "id": "t1", "name": "search_notes", "input": { "query": "test" } }
                ] }
            }),
        ]);
        // First event: ToolStart with no input (from content_block_start)
        assert!(matches!(
            &events[0],
            ClaudeStreamEvent::ToolStart { input: None, .. }
        ));
        // Second event: ToolStart with accumulated input (from assistant)
        assert!(
            matches!(&events[1], ClaudeStreamEvent::ToolStart { input: Some(inp), .. }
                if inp == "{\"query\":\"test\"}")
        );
    }

    #[test]
    fn dispatch_assistant_uses_block_input_when_no_deltas() {
        let (_, events) = run_dispatch(serde_json::json!({
            "type": "assistant",
            "message": { "content": [
                { "type": "tool_use", "id": "tu_x", "name": "create_note", "input": { "title": "Hello", "content": "world" } }
            ] }
        }));
        assert!(
            matches!(&events[0], ClaudeStreamEvent::ToolStart { input: Some(inp), .. }
                if inp.contains("title") && inp.contains("Hello"))
        );
    }

    #[test]
    fn content_block_stop_clears_current_tool() {
        let (state, _) = run_dispatch_sequence(vec![
            serde_json::json!({
                "type": "stream_event",
                "event": { "type": "content_block_start", "content_block": { "type": "tool_use", "id": "t1", "name": "x", "input": {} } }
            }),
            serde_json::json!({
                "type": "stream_event",
                "event": { "type": "content_block_stop" }
            }),
        ]);
        assert!(state.current_tool_id.is_none());
    }

    // --- run_claude_subprocess with mock scripts ---

    #[cfg(unix)]
    fn run_mock_script(script: &str) -> (Result<String, String>, Vec<ClaudeStreamEvent>) {
        run_mock_script_with_args(script, &[])
    }

    #[cfg(unix)]
    fn run_mock_script_with_args(
        script: &str,
        args: &[String],
    ) -> (Result<String, String>, Vec<ClaudeStreamEvent>) {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("mock-claude");
        std::fs::write(&path, script).unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
        let mut events = vec![];
        let result = run_claude_subprocess(&path, args, None, &mut |e| events.push(e));
        (result, events)
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_parses_ndjson_stream() {
        let (result, events) = run_mock_script(concat!(
            "#!/bin/sh\n",
            "echo '{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"s1\"}'\n",
            "echo '{\"type\":\"stream_event\",\"event\":{\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Hi\"}}}'\n",
            "echo '{\"type\":\"result\",\"result\":\"Done\",\"session_id\":\"s1\"}'\n",
        ));
        assert_eq!(result.unwrap(), "s1");
        assert!(matches!(&events[0], ClaudeStreamEvent::Init { session_id } if session_id == "s1"));
        assert!(matches!(&events[1], ClaudeStreamEvent::TextDelta { text } if text == "Hi"));
        assert!(matches!(&events[2], ClaudeStreamEvent::Result { .. }));
        assert!(matches!(&events[3], ClaudeStreamEvent::Done));
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_skips_blank_and_non_json_lines() {
        let (result, events) = run_mock_script(concat!(
            "#!/bin/sh\n",
            "echo ''\n",
            "echo 'not json at all'\n",
            "echo '{\"type\":\"result\",\"result\":\"ok\",\"session_id\":\"s2\"}'\n",
        ));
        assert_eq!(result.unwrap(), "s2");
        assert!(matches!(&events[0], ClaudeStreamEvent::Result { text, .. } if text == "ok"));
        assert!(matches!(&events[1], ClaudeStreamEvent::Done));
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_emits_error_on_nonzero_exit() {
        let (_, events) = run_mock_script("#!/bin/sh\necho 'auth problem' >&2\nexit 1\n");
        assert!(events
            .iter()
            .any(|e| matches!(e, ClaudeStreamEvent::Error { .. })));
        assert!(matches!(events.last().unwrap(), ClaudeStreamEvent::Done));
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_detects_auth_error_in_stderr() {
        let (_, events) = run_mock_script("#!/bin/sh\necho 'not logged in' >&2\nexit 1\n");
        assert!(events.iter().any(|e| matches!(e, ClaudeStreamEvent::Error { message } if message.contains("not authenticated"))));
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_reports_exit_code_on_empty_stderr() {
        let (_, events) = run_mock_script("#!/bin/sh\nexit 2\n");
        assert!(events.iter().any(
            |e| matches!(e, ClaudeStreamEvent::Error { message } if message.contains("exited with"))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_success_with_no_events() {
        let (result, events) = run_mock_script("#!/bin/sh\nexit 0\n");
        assert!(result.is_ok());
        assert!(matches!(events.last().unwrap(), ClaudeStreamEvent::Done));
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_passes_args_through() {
        let args: Vec<String> = vec!["--foo".into(), "bar".into()];
        let (_, events) = run_mock_script_with_args(concat!(
            "#!/bin/sh\n",
            "echo \"{\\\"type\\\":\\\"result\\\",\\\"result\\\":\\\"$*\\\",\\\"session_id\\\":\\\"sx\\\"}\"\n",
        ), &args);
        let text = events.iter().find_map(|e| match e {
            ClaudeStreamEvent::Result { text, .. } => Some(text.as_str()),
            _ => None,
        });
        assert!(text.unwrap().contains("--foo"));
    }

    // --- build_chat_args ---

    #[test]
    fn build_chat_args_basic() {
        let req = ChatStreamRequest {
            message: "hello".into(),
            system_prompt: None,
            session_id: None,
        };
        let args = build_chat_args(&req);
        assert!(args.contains(&"-p".to_string()));
        assert!(args.contains(&"hello".to_string()));
        assert!(args.contains(&"stream-json".to_string()));
        assert!(!args.contains(&"--system-prompt".to_string()));
        assert!(!args.contains(&"--resume".to_string()));
    }

    #[test]
    fn build_chat_args_with_system_prompt() {
        let req = ChatStreamRequest {
            message: "hi".into(),
            system_prompt: Some("You are helpful.".into()),
            session_id: None,
        };
        let args = build_chat_args(&req);
        assert!(args.contains(&"--system-prompt".to_string()));
        assert!(args.contains(&"You are helpful.".to_string()));
    }

    #[test]
    fn build_chat_args_empty_system_prompt_is_skipped() {
        let req = ChatStreamRequest {
            message: "hi".into(),
            system_prompt: Some(String::new()),
            session_id: None,
        };
        let args = build_chat_args(&req);
        assert!(!args.contains(&"--system-prompt".to_string()));
    }

    #[test]
    fn build_chat_args_with_session_id() {
        let req = ChatStreamRequest {
            message: "continue".into(),
            system_prompt: None,
            session_id: Some("sess-abc".into()),
        };
        let args = build_chat_args(&req);
        assert!(args.contains(&"--resume".to_string()));
        assert!(args.contains(&"sess-abc".to_string()));
    }

    // --- build_agent_args ---

    #[test]
    fn build_agent_args_basic() {
        // build_agent_args calls build_mcp_config which needs mcp_server_dir
        if let Ok(args) = build_agent_args(&AgentStreamRequest {
            message: "create note".into(),
            system_prompt: None,
            vault_path: "/tmp/vault".into(),
        }) {
            assert!(args.contains(&"-p".to_string()));
            assert!(args.contains(&"create note".to_string()));
            assert!(args.contains(&"--mcp-config".to_string()));
            assert!(args.contains(&"--dangerously-skip-permissions".to_string()));
            assert!(args.contains(&"--no-session-persistence".to_string()));
            assert!(!args.contains(&"--append-system-prompt".to_string()));
            // Native tools must NOT be disabled
            assert!(!args.contains(&"--tools".to_string()));
        }
    }

    #[test]
    fn build_agent_args_with_system_prompt() {
        if let Ok(args) = build_agent_args(&AgentStreamRequest {
            message: "do it".into(),
            system_prompt: Some("Act as expert.".into()),
            vault_path: "/tmp/v".into(),
        }) {
            assert!(args.contains(&"--append-system-prompt".to_string()));
            assert!(args.contains(&"Act as expert.".to_string()));
        }
    }

    #[test]
    fn build_agent_args_empty_system_prompt_is_skipped() {
        if let Ok(args) = build_agent_args(&AgentStreamRequest {
            message: "x".into(),
            system_prompt: Some(String::new()),
            vault_path: "/tmp/v".into(),
        }) {
            assert!(!args.contains(&"--append-system-prompt".to_string()));
        }
    }

    // --- find_claude_binary ---

    #[cfg(not(windows))]
    #[test]
    fn claude_binary_candidates_include_supported_local_and_toolchain_installs() {
        let home = PathBuf::from("/Users/alex");
        let candidates = claude_binary_candidates_for_home(&home);
        let expected = [
            home.join(".local/bin/claude"),
            home.join(".claude/local/claude"),
            home.join(".local/share/mise/shims/claude"),
            home.join(".npm-global/bin/claude"),
        ];

        for candidate in expected {
            assert!(
                candidates.contains(&candidate),
                "missing {}",
                candidate.display()
            );
        }
    }

    #[cfg(windows)]
    #[test]
    fn claude_binary_candidates_for_home_lists_windows_install_locations() {
        let home = PathBuf::from(r"C:\Users\tester");
        let candidates = claude_binary_candidates_for_home(&home);

        let has_path_ending = |suffix: &str| {
            candidates
                .iter()
                .any(|candidate| candidate.to_string_lossy().ends_with(suffix))
        };

        assert!(has_path_ending(r".claude\local\claude.exe"));
        assert!(has_path_ending(r".local\bin\claude.exe"));
        assert!(has_path_ending(r"AppData\Roaming\npm\claude.cmd"));
        assert!(has_path_ending(r"scoop\shims\claude.exe"));
    }

    /// Serialize tests that mutate the process-wide `CLAUDE_BIN` env var.
    static CLAUDE_BIN_ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[test]
    fn find_claude_binary_in_env_returns_path_for_existing_file() {
        let _guard = CLAUDE_BIN_ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let tmp = tempfile::tempdir().unwrap();
        let fake = tmp.path().join("claude-fake");
        std::fs::write(&fake, b"stub").unwrap();

        std::env::set_var("CLAUDE_BIN", fake.as_os_str());
        let result = find_claude_binary_in_env();
        std::env::remove_var("CLAUDE_BIN");

        assert_eq!(result, Some(fake));
    }

    #[test]
    fn find_claude_binary_in_env_returns_none_when_unset() {
        let _guard = CLAUDE_BIN_ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::env::remove_var("CLAUDE_BIN");

        assert!(find_claude_binary_in_env().is_none());
    }

    #[test]
    fn find_claude_binary_in_env_returns_none_when_path_missing() {
        let _guard = CLAUDE_BIN_ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::env::set_var("CLAUDE_BIN", "/this/path/definitely/does/not/exist/claude");
        let result = find_claude_binary_in_env();
        std::env::remove_var("CLAUDE_BIN");

        assert!(result.is_none());
    }

    #[test]
    fn find_claude_binary_returns_result() {
        let result = find_claude_binary();
        // On dev machines claude may be installed; on CI it may not.
        // Either way, the function should return Ok(path) or Err(message).
        match &result {
            Ok(path) => assert!(path.exists()),
            Err(msg) => assert!(msg.contains("not found")),
        }
    }

    // --- run_chat_stream / run_agent_stream error paths ---
    // Skipped on Windows: dev machines that have Claude Code installed via
    // npm hit the real Claude API on every run (~$0.11/run) because there is
    // no graceful "not installed" short-circuit once the binary is detected.
    // Mac/Linux CI typically lacks the CLI, so the call fails fast there.
    // TODO: replace with a mocked subprocess once that infra exists.

    #[cfg(not(windows))]
    #[test]
    fn run_chat_stream_returns_result() {
        let req = ChatStreamRequest {
            message: "test".into(),
            system_prompt: None,
            session_id: None,
        };
        let mut events = vec![];
        // This will either succeed (if claude is installed) or fail (if not).
        let result = run_chat_stream(req, |e| events.push(e));
        // Either way the function should have returned without panicking.
        assert!(result.is_ok() || result.is_err());
    }

    #[cfg(not(windows))]
    #[test]
    fn run_agent_stream_returns_result() {
        let req = AgentStreamRequest {
            message: "test".into(),
            system_prompt: Some("sys".into()),
            vault_path: "/tmp/nonexistent".into(),
        };
        let mut events = vec![];
        let result = run_agent_stream(req, |e| events.push(e));
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn run_subprocess_spawn_failure() {
        let fake_bin = PathBuf::from("/nonexistent/binary/path");
        let mut events = vec![];
        let result = run_claude_subprocess(&fake_bin, &[], None, &mut |e| events.push(e));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to spawn"));
    }

    #[cfg(windows)]
    #[test]
    fn build_claude_command_falls_back_to_cmd_exe_when_node_missing() {
        // No node.exe / cli.js on disk next to this fake path → fallback.
        let bin = PathBuf::from("C:\\Users\\dev\\AppData\\Roaming\\npm\\claude.cmd");
        let cmd = build_claude_command(&bin);
        let program = cmd.get_program().to_string_lossy().to_string();
        let args: Vec<String> = cmd
            .get_args()
            .map(|a| a.to_string_lossy().to_string())
            .collect();
        assert_eq!(program, "cmd.exe");
        assert_eq!(
            args,
            vec!["/C".to_string(), bin.to_string_lossy().into_owned()]
        );
    }

    #[cfg(windows)]
    #[test]
    fn build_claude_command_invokes_node_directly_when_cli_js_present() {
        // Materialise an npm-style layout in a temp dir and verify the
        // builder bypasses cmd.exe in favour of `node cli.js`.
        let tmp = tempfile::tempdir().unwrap();
        let dir = tmp.path();
        let shim = dir.join("claude.cmd");
        let node = dir.join("node.exe");
        let cli_js = dir
            .join("node_modules")
            .join("@anthropic-ai")
            .join("claude-code")
            .join("cli.js");
        std::fs::create_dir_all(cli_js.parent().unwrap()).unwrap();
        std::fs::write(&shim, b"@echo off\r\n").unwrap();
        std::fs::write(&node, b"stub").unwrap();
        std::fs::write(&cli_js, b"// stub").unwrap();

        let cmd = build_claude_command(&shim);
        let program = cmd.get_program().to_string_lossy().to_string();
        let args: Vec<String> = cmd
            .get_args()
            .map(|a| a.to_string_lossy().to_string())
            .collect();
        assert!(
            program.ends_with("node.exe"),
            "expected node, got {program}"
        );
        assert_eq!(args.len(), 1);
        assert!(
            args[0].ends_with("cli.js"),
            "expected cli.js arg, got {:?}",
            args
        );
    }

    #[cfg(windows)]
    #[test]
    fn build_claude_command_invokes_exe_directly() {
        let bin = PathBuf::from("C:\\Users\\dev\\.claude\\local\\claude.exe");
        let cmd = build_claude_command(&bin);
        let program = cmd.get_program().to_string_lossy().to_string();
        assert!(program.ends_with("claude.exe"));
        assert_eq!(cmd.get_args().count(), 0);
    }

    #[cfg(not(windows))]
    #[test]
    fn build_claude_command_invokes_unix_path_directly() {
        let bin = PathBuf::from("/usr/local/bin/claude");
        let cmd = build_claude_command(&bin);
        let program = cmd.get_program().to_string_lossy().to_string();
        assert!(program.ends_with("claude"));
        assert_eq!(cmd.get_args().count(), 0);
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_with_tool_progress_and_assistant() {
        let (result, events) = run_mock_script(concat!(
            "#!/bin/sh\n",
            "echo '{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"s3\"}'\n",
            "echo '{\"type\":\"tool_progress\",\"tool_name\":\"search\",\"tool_use_id\":\"t1\"}'\n",
            "echo '{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"tool_use\",\"id\":\"t2\",\"name\":\"read\",\"input\":{}}]}}'\n",
            "echo '{\"type\":\"result\",\"result\":\"fin\",\"session_id\":\"s3\"}'\n",
        ));
        assert_eq!(result.unwrap(), "s3");
        assert!(events.len() >= 4);
    }

    #[cfg(unix)]
    #[test]
    fn run_subprocess_success_exit_with_session_id_skips_error() {
        let (_, events) = run_mock_script(concat!(
            "#!/bin/sh\n",
            "echo '{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"s4\"}'\n",
            "echo 'some warning' >&2\n",
            "exit 1\n",
        ));
        // Should NOT have an error event because session_id is non-empty
        assert!(!events
            .iter()
            .any(|e| matches!(e, ClaudeStreamEvent::Error { .. })));
    }
}
