use std::ffi::CString;
use std::os::raw::c_char;
#[cfg(target_os = "ios")]
use std::os::raw::c_void;

#[cfg(target_os = "ios")]
type IOSBridgeFn = unsafe extern "C" fn(*const c_char) -> i32;

#[cfg(target_os = "ios")]
unsafe extern "C" {
  fn dlsym(handle: *mut c_void, symbol: *const c_char) -> *mut c_void;
}

#[cfg(target_os = "ios")]
fn resolve_ios_symbol(symbol: &str) -> Result<IOSBridgeFn, String> {
  const RTLD_DEFAULT: *mut c_void = -2isize as *mut c_void;
  let symbol_c = CString::new(symbol).map_err(|_| "invalid symbol".to_string())?;
  let ptr = unsafe { dlsym(RTLD_DEFAULT, symbol_c.as_ptr()) };
  if ptr.is_null() {
    log::error!("[ios-bridge] symbol not found: {symbol}");
    return Err(format!("native symbol not found: {symbol}"));
  }

  let func = unsafe { std::mem::transmute::<*mut c_void, IOSBridgeFn>(ptr) };
  Ok(func)
}

#[cfg(target_os = "ios")]
fn forward_to_ios(command: &str, payload: String) -> Result<(), String> {
  let symbols: &[&str] = match command {
    "start" => &["ios_start_live_activity", "syncseeker_ios_start_live_activity"],
    "update" => &["ios_update_live_activity", "syncseeker_ios_update_live_activity"],
    "stop" => &["ios_stop_live_activity", "syncseeker_ios_stop_live_activity"],
    "widget" => &["ios_sync_widget_snapshot", "syncseeker_ios_sync_widget_snapshot"],
    _ => return Err("unsupported ios command".to_string()),
  };

  let mut last_error = String::new();
  let mut selected_symbol: Option<&str> = None;
  let mut native_fn: Option<IOSBridgeFn> = None;

  for symbol in symbols {
    match resolve_ios_symbol(symbol) {
      Ok(func) => {
        selected_symbol = Some(symbol);
        native_fn = Some(func);
        break;
      }
      Err(e) => {
        last_error = e;
      }
    }
  }

  let symbol = selected_symbol.ok_or(last_error)?;
  let native_fn = native_fn.ok_or("native symbol resolver failed".to_string())?;
  let payload_c = CString::new(payload).map_err(|_| "invalid payload".to_string())?;
  log::info!("[ios-bridge] invoke command={command} symbol={symbol}");
  let result = unsafe { native_fn(payload_c.as_ptr()) };

  if result == 0 {
    log::info!("[ios-bridge] command={command} success");
    Ok(())
  } else {
    log::error!("[ios-bridge] command={command} failed code={result}");
    Err(format!("native bridge error: {result}"))
  }
}

#[cfg(not(target_os = "ios"))]
fn forward_to_ios(_command: &str, _payload: String) -> Result<(), String> {
  Ok(())
}

#[tauri::command]
fn ios_start_live_activity(payload: String) -> Result<(), String> {
  forward_to_ios("start", payload)
}

#[tauri::command]
fn ios_update_live_activity(payload: String) -> Result<(), String> {
  forward_to_ios("update", payload)
}

#[tauri::command]
fn ios_stop_live_activity(payload: String) -> Result<(), String> {
  forward_to_ios("stop", payload)
}

#[tauri::command]
fn ios_sync_widget_snapshot(payload: String) -> Result<(), String> {
  forward_to_ios("widget", payload)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      ios_start_live_activity,
      ios_update_live_activity,
      ios_stop_live_activity,
      ios_sync_widget_snapshot
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
