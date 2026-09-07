// Avalon Calculator — núcleo compartilhado do shell Tauri.
// A lógica da calculadora em si vive em src/calculator.js (compartilhada
// entre Windows e Android via WebView); este arquivo só inicializa a janela
// nativa. Precisa estar na *lib* (não no bin) porque o runner Android do
// Tauri carrega este crate como cdylib e chama `run()` diretamente.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Avalon Calculator");
}
