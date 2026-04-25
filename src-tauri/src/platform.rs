use std::path::PathBuf;
use std::process::Command;

/// Build a `which`/`where.exe` command that resolves the path of an executable
/// the user already has on `PATH`. Always wraps `crate::hidden_command` so the
/// helper console window is suppressed on Windows.
pub(crate) fn which_command(name: &str) -> Command {
    #[cfg(windows)]
    let mut command = crate::hidden_command("where.exe");
    #[cfg(not(windows))]
    let mut command = crate::hidden_command("which");

    command.arg(name);
    command
}

/// Pick the first non-empty line of `which`/`where.exe` stdout that points at
/// a file `Command::new` can directly invoke on the current OS.
///
/// `where.exe` may print every shadowed candidate, and on Windows npm drops
/// both an extensionless sh-style shim and a `.cmd` wrapper for the same
/// binary. `Command::new` on Windows can only spawn entries whose extension
/// is in the standard PATHEXT set, so the sh shim has to be skipped.
pub(crate) fn first_executable_path_line(stdout: &str) -> Option<PathBuf> {
    stdout.lines().find_map(|line| {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }
        let candidate = PathBuf::from(trimmed);
        if !candidate.is_file() {
            return None;
        }
        #[cfg(windows)]
        {
            const EXEC_EXTENSIONS: &[&str] = &["exe", "cmd", "bat", "ps1", "com"];
            let ext = candidate
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("");
            if !EXEC_EXTENSIONS
                .iter()
                .any(|allowed| ext.eq_ignore_ascii_case(allowed))
            {
                return None;
            }
        }
        Some(candidate)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn which_command_resolves_a_known_system_binary() {
        #[cfg(windows)]
        let target = "cmd";
        #[cfg(not(windows))]
        let target = "sh";

        let output = which_command(target)
            .output()
            .expect("which/where.exe should run");
        assert!(output.status.success(), "expected to locate {target}");
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(
            !stdout.trim().is_empty(),
            "expected a path on stdout for {target}"
        );
    }

    #[test]
    fn which_command_for_missing_binary_fails_gracefully() {
        let output = which_command("definitely-does-not-exist-xyz123")
            .output()
            .expect("which/where.exe should still run");
        assert!(!output.status.success());
    }

    #[test]
    fn first_executable_path_line_picks_first_real_file() {
        let tmp = tempfile::tempdir().unwrap();
        let real = tmp.path().join("real.exe");
        std::fs::write(&real, b"stub").unwrap();
        let fake = tmp.path().join("missing.exe");

        let stdout = format!("{}\n{}\n", fake.display(), real.display());
        assert_eq!(first_executable_path_line(&stdout), Some(real));
    }

    #[test]
    fn first_executable_path_line_returns_none_for_blank_stdout() {
        assert!(first_executable_path_line("").is_none());
        assert!(first_executable_path_line("   \n\t\n").is_none());
    }

    #[cfg(windows)]
    #[test]
    fn first_executable_path_line_skips_extensionless_shims_on_windows() {
        let tmp = tempfile::tempdir().unwrap();
        let sh_shim = tmp.path().join("claude");
        let cmd_shim = tmp.path().join("claude.cmd");
        std::fs::write(&sh_shim, b"#!/usr/bin/env sh\n").unwrap();
        std::fs::write(&cmd_shim, b"@echo off\r\n").unwrap();

        let stdout = format!("{}\n{}\n", sh_shim.display(), cmd_shim.display());
        // npm drops both a sh-style shim and a .cmd wrapper next to each other
        // on Windows; only the .cmd is something `Command::new` can invoke.
        assert_eq!(first_executable_path_line(&stdout), Some(cmd_shim));
    }

    #[cfg(not(windows))]
    #[test]
    fn first_executable_path_line_accepts_extensionless_files_on_unix() {
        let tmp = tempfile::tempdir().unwrap();
        let bin = tmp.path().join("claude");
        std::fs::write(&bin, b"#!/usr/bin/env sh\n").unwrap();

        let stdout = format!("{}\n", bin.display());
        assert_eq!(first_executable_path_line(&stdout), Some(bin));
    }
}
