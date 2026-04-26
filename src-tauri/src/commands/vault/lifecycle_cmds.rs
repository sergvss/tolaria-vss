use crate::commands::{expand_tilde, strip_extended_length_prefix};
use crate::{git, vault};
use std::path::Path;

#[tauri::command]
pub fn migrate_is_a_to_type(vault_path: String) -> Result<usize, String> {
    let vault_path = expand_tilde(&vault_path);
    vault::migrate_is_a_to_type(&vault_path)
}

#[tauri::command]
pub fn create_empty_vault(target_path: String) -> Result<String, String> {
    let path = expand_tilde(&target_path).into_owned();
    let vault_dir = Path::new(&path);
    initialize_empty_vault(vault_dir, &path)?;
    Ok(canonical_vault_path_string(vault_dir))
}

fn initialize_empty_vault(vault_dir: &Path, vault_path: &str) -> Result<(), String> {
    ensure_directory_is_missing_or_empty(vault_dir)?;
    std::fs::create_dir_all(vault_dir)
        .map_err(|e| format!("Failed to create vault directory: {}", e))?;

    git::init_repo(vault_path)?;
    vault::seed_config_files(vault_path);
    Ok(())
}

fn ensure_directory_is_missing_or_empty(vault_dir: &Path) -> Result<(), String> {
    if !vault_dir.exists() {
        return Ok(());
    }

    let metadata = std::fs::metadata(vault_dir)
        .map_err(|e| format!("Failed to inspect target folder: {e}"))?;
    if !metadata.is_dir() {
        return Err("Choose a folder path for the new vault".to_string());
    }

    let has_entries = std::fs::read_dir(vault_dir)
        .map_err(|e| format!("Failed to inspect target folder: {e}"))?
        .next()
        .is_some();
    if has_entries {
        return Err("Choose an empty folder to create a new vault".to_string());
    }

    Ok(())
}

fn canonical_vault_path_string(vault_dir: &Path) -> String {
    let canonical = vault_dir
        .canonicalize()
        .unwrap_or_else(|_| vault_dir.to_path_buf());
    strip_extended_length_prefix(canonical)
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
pub async fn create_getting_started_vault(target_path: Option<String>) -> Result<String, String> {
    let path = resolve_getting_started_target(target_path.as_deref())?;
    tokio::task::spawn_blocking(move || vault::create_getting_started_vault(&path))
        .await
        .map_err(|e| format!("Task panicked: {e}"))?
}

fn resolve_getting_started_target(target_path: Option<&str>) -> Result<String, String> {
    match target_path {
        Some(path) if !path.is_empty() => Ok(expand_tilde(path).into_owned()),
        _ => vault::default_vault_path().map(|path| path.to_string_lossy().to_string()),
    }
}

#[tauri::command]
pub fn check_vault_exists(path: String) -> bool {
    let path = expand_tilde(&path);
    vault::vault_exists(&path)
}

#[tauri::command]
pub fn get_default_vault_path() -> Result<String, String> {
    vault::default_vault_path().map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn repair_vault(vault_path: String) -> Result<String, String> {
    let vault_path = expand_tilde(&vault_path);
    vault::migrate_is_a_to_type(&vault_path)?;
    vault::repair_config_files(&vault_path)?;
    git::ensure_gitignore(&vault_path)?;
    Ok("Vault repaired".to_string())
}

// Tests for `strip_extended_length_prefix` live alongside the helper itself
// in `crate::commands` (the function moved up so it can be reused by every
// command that hands a path back to the renderer).

#[cfg(test)]
mod tests {
    use crate::commands::strip_extended_length_prefix;
    use std::path::PathBuf;

    #[cfg(windows)]
    #[test]
    fn strip_extended_length_prefix_drops_unc_prefix_on_drive_paths() {
        let stripped = strip_extended_length_prefix(PathBuf::from(r"\\?\C:\Users\name\vault"));
        assert_eq!(stripped, PathBuf::from(r"C:\Users\name\vault"));
    }

    #[cfg(windows)]
    #[test]
    fn strip_extended_length_prefix_keeps_unc_network_paths_intact() {
        // `\\?\UNC\server\share` is the extended form of `\\server\share`;
        // dropping `\\?\` here would corrupt the path into `UNC\server\share`.
        let stripped = strip_extended_length_prefix(PathBuf::from(r"\\?\UNC\server\share"));
        assert_eq!(stripped, PathBuf::from(r"\\?\UNC\server\share"));
    }

    #[test]
    fn strip_extended_length_prefix_is_a_noop_for_paths_without_prefix() {
        let path = PathBuf::from("/Users/name/vault");
        assert_eq!(strip_extended_length_prefix(path.clone()), path);
    }
}
