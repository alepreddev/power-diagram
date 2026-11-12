use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewWindow, WindowEvent};

const STATE_FILE_NAME: &str = "window-state.json";
const DEFAULT_WIDTH: u32 = 1200;
const DEFAULT_HEIGHT: u32 = 720;
const MIN_WIDTH: u32 = 400;
const MIN_HEIGHT: u32 = 300;
const SAVE_THROTTLE: Duration = Duration::from_millis(500);
const STARTUP_MAXIMIZE_GRACE: Duration = Duration::from_millis(1500);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct WindowState {
    width: u32,
    height: u32,
    x: Option<i32>,
    y: Option<i32>,
    maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            x: None,
            y: None,
            maximized: true,
        }
    }
}

struct WindowStateTracker {
    state: WindowState,
    state_path: Option<PathBuf>,
    pending_maximize: bool,
    started_at: Instant,
    last_saved: Instant,
}

impl WindowStateTracker {
    fn persist(&mut self, force: bool) {
        if !force && self.last_saved.elapsed() < SAVE_THROTTLE {
            return;
        }
        if let Some(path) = &self.state_path {
            save_state(path, &self.state);
            self.last_saved = Instant::now();
        }
    }
}

fn load_state(path: &Path) -> Option<WindowState> {
    let raw = fs::read_to_string(path).ok()?;
    let mut parsed: WindowState = serde_json::from_str(&raw).ok()?;
    if parsed.width < MIN_WIDTH || parsed.height < MIN_HEIGHT {
        parsed.width = DEFAULT_WIDTH;
        parsed.height = DEFAULT_HEIGHT;
    }
    Some(parsed)
}

fn save_state(path: &Path, state: &WindowState) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(state) {
        let _ = fs::write(path, json);
    }
}

fn rect_overlaps_work_area(
    x: i32,
    y: i32,
    width: u32,
    area_pos: PhysicalPosition<i32>,
    area_size: PhysicalSize<u32>,
) -> bool {
    let win_right = x.saturating_add(width as i32);
    let left = area_pos.x;
    let top = area_pos.y;
    let right = left.saturating_add(area_size.width as i32);
    let bottom = top.saturating_add(area_size.height as i32);

    // Require enough horizontal overlap and a reachable titlebar on the monitor.
    x < right - 80 && win_right > left + 80 && y >= top - 16 && y < bottom - 40
}

fn is_position_visible(window: &WebviewWindow, x: i32, y: i32, width: u32) -> bool {
    let Ok(monitors) = window.available_monitors() else {
        return false;
    };
    if monitors.is_empty() {
        return false;
    }

    monitors.into_iter().any(|monitor| {
        let area = monitor.work_area();
        rect_overlaps_work_area(x, y, width, area.position, area.size)
    })
}

/// Restores saved window geometry (defaulting to maximized on first launch)
/// and tracks future resize, move, maximize, and close events.
pub fn setup_window_state(app: &tauri::App, window: &WebviewWindow) {
    let state_path = app
        .path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(STATE_FILE_NAME));

    let loaded = state_path.as_deref().and_then(load_state);
    let is_first_launch = loaded.is_none();
    let mut state = loaded.unwrap_or_default();

    let _ = window.set_size(PhysicalSize::new(state.width, state.height));

    match (state.x, state.y) {
        (Some(x), Some(y)) if is_position_visible(window, x, y, state.width) => {
            let _ = window.set_position(PhysicalPosition::new(x, y));
        }
        _ => {
            state.x = None;
            state.y = None;
            let _ = window.center();
        }
    }

    if state.maximized {
        let _ = window.maximize();
    }

    let _ = window.show();

    if is_first_launch {
        if let Some(path) = &state_path {
            save_state(path, &state);
        }
    }

    let tracker = Arc::new(Mutex::new(WindowStateTracker {
        pending_maximize: state.maximized,
        state,
        state_path,
        started_at: Instant::now(),
        last_saved: Instant::now(),
    }));

    let window_handle = window.clone();
    window.on_window_event(move |event| {
        let Ok(mut guard) = tracker.lock() else {
            return;
        };

        match event {
            WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed => {
                guard.persist(true);
            }
            WindowEvent::Resized(size) => {
                if !window_handle.is_visible().unwrap_or(false)
                    || window_handle.is_minimized().unwrap_or(false)
                {
                    return;
                }

                let is_maximized = window_handle.is_maximized().unwrap_or(false);
                if guard.pending_maximize {
                    if is_maximized {
                        guard.pending_maximize = false;
                    } else if guard.started_at.elapsed() < STARTUP_MAXIMIZE_GRACE {
                        return;
                    } else {
                        guard.pending_maximize = false;
                    }
                }

                let maximized_changed = guard.state.maximized != is_maximized;
                guard.state.maximized = is_maximized;

                if !is_maximized && size.width >= MIN_WIDTH && size.height >= MIN_HEIGHT {
                    guard.state.width = size.width;
                    guard.state.height = size.height;
                }

                guard.persist(maximized_changed);
            }
            WindowEvent::Moved(position) => {
                if !window_handle.is_visible().unwrap_or(false)
                    || window_handle.is_minimized().unwrap_or(false)
                    || window_handle.is_maximized().unwrap_or(false)
                {
                    return;
                }

                if guard.pending_maximize {
                    if guard.started_at.elapsed() < STARTUP_MAXIMIZE_GRACE {
                        return;
                    }
                    guard.pending_maximize = false;
                }

                guard.state.x = Some(position.x);
                guard.state.y = Some(position.y);
                guard.persist(false);
            }
            _ => {}
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_window_state_starts_maximized() {
        let state = WindowState::default();
        assert_eq!(state.width, DEFAULT_WIDTH);
        assert_eq!(state.height, DEFAULT_HEIGHT);
        assert_eq!(state.x, None);
        assert_eq!(state.y, None);
        assert!(state.maximized);
    }

    #[test]
    fn save_and_load_roundtrip_and_min_size_fallback() {
        let dir = std::env::temp_dir().join(format!(
            "power_diagram_win_state_test_{}",
            std::process::id()
        ));
        let path = dir.join(STATE_FILE_NAME);
        let _ = fs::remove_dir_all(&dir);

        let saved = WindowState {
            width: 1024,
            height: 640,
            x: Some(150),
            y: Some(90),
            maximized: false,
        };
        save_state(&path, &saved);
        assert_eq!(load_state(&path), Some(saved));

        let too_small = WindowState {
            width: 50,
            height: 20,
            x: Some(10),
            y: Some(10),
            maximized: false,
        };
        save_state(&path, &too_small);
        let loaded = load_state(&path).expect("saved state should load");
        assert_eq!(loaded.width, DEFAULT_WIDTH);
        assert_eq!(loaded.height, DEFAULT_HEIGHT);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn work_area_visibility_checks_disconnected_monitors() {
        let monitor_pos = PhysicalPosition::new(0, 0);
        let monitor_size = PhysicalSize::new(1920, 1040);

        assert!(rect_overlaps_work_area(100, 100, 1200, monitor_pos, monitor_size));
        assert!(!rect_overlaps_work_area(2500, 100, 1200, monitor_pos, monitor_size));
        assert!(!rect_overlaps_work_area(100, -100, 1200, monitor_pos, monitor_size));
    }
}
