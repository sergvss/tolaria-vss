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
}
