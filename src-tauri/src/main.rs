// Avalon Calculator — ponto de entrada do binário desktop (Windows/Linux/macOS).
// A inicialização de fato mora em lib.rs, reaproveitada pelo runner Android.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    avalon_calculator_lib::run();
}
