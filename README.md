<div align="center">
  <img src="desktop/assets/icon.png" width="160" alt="Hacklily Desktop icon" />

  # Hacklily Desktop

  **Editor offline de partituras LilyPond — sin servidores externos**

  [![Última versión](https://img.shields.io/github/v/release/JLMirallesB/hacklily?label=descargar&style=for-the-badge&logo=github)](https://github.com/JLMirallesB/hacklily/releases/latest)
  [![Licencia: GPL v3](https://img.shields.io/badge/Licencia-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

</div>

---

**Hacklily Desktop** es una aplicación de escritorio para macOS y Windows que permite editar y renderizar partituras escritas en [LilyPond](http://lilypond.org/) **completamente sin conexión a internet**. El renderizado se realiza de forma local, sin depender de ningún servidor externo.

> ¿Prefieres usar la versión web? El proyecto original funciona online en **[hacklily.org](https://www.hacklily.org)** — no necesitas instalar nada.

---

## ✨ Características

- 🎼 **Editor Monaco** (el mismo que alimenta VS Code) con resaltado de sintaxis LilyPond
- ⚡ **Renderizado 100% local** — LilyPond se ejecuta en tu máquina, sin servidores
- 🎵 **Reproducción MIDI** integrada
- 📂 **Explorador de MutopiaProject** — navega y abre directamente partituras del repositorio público [MutopiaProject](https://www.mutopiaproject.org/), con resolución automática de dependencias entre archivos
- 📤 Exporta a **PDF**, **MIDI** y **LilyPond** `.ly`
- 🌙 Tema claro y oscuro
- 🖥️ Disponible para **macOS** (Intel/Rosetta) y **Windows**

---

## 📥 Descargar

👉 [**Descargar la última versión**](https://github.com/JLMirallesB/hacklily/releases/latest)

| Plataforma | Formato |
|------------|---------|
| macOS | `.dmg` (x86_64 / Rosetta 2 en Apple Silicon) |
| Windows | `.exe` (instalador NSIS) |

> **macOS**: Si el sistema advierte que la app está dañada, ejecuta en Terminal:
> ```bash
> xattr -cr "/Applications/Hacklily Desktop.app"
> ```

---

## 🗒️ Explorador de MutopiaProject

[MutopiaProject](https://www.mutopiaproject.org/) es un repositorio de miles de partituras en formato LilyPond, de libre distribución. Hacklily Desktop incluye un explorador integrado (menú **File → Browse MutopiaProject…**) que permite navegar el catálogo, abrir cualquier partitura y renderizarla al instante — incluso las que están divididas en múltiples archivos (cuartetos, orquesta…), que se ensamblan automáticamente.

---

## 🛠️ Desarrollado sobre

- **[Hacklily](https://github.com/emilyskidsister/hacklily)** — el editor web original, creado por [Jocelyn Stericker](https://nettek.ca). Esta aplicación de escritorio es un fork del proyecto original.
- **[LilyPond](http://lilypond.org/)** — el motor de grabado musical de código abierto.
- **[MutopiaProject](https://www.mutopiaproject.org/)** — repositorio de partituras libres en LilyPond.
- **[Electron](https://www.electronjs.org/)** — para empaquetar la app como ejecutable de escritorio.
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** — editor de código con soporte LilyPond.

---

## 👤 Autoría del fork

Este fork ha sido creado por **José Luis Miralles Bono** · [jlmirall.es](https://www.jlmirall.es)

Si la aplicación te resulta útil, puedes invitarme a un café ☕:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/miralles)

---

## 📜 Licencia

Por respeto al proyecto LilyPond del que depende Hacklily, y para garantizar que todos los forks permanezcan como software libre, el cliente está licenciado bajo la **GNU GPL versión 3 o posterior**, y el servidor bajo la **GNU AGPL versión 3 o posterior**.

El código fuente original es © 2017 - present [Jocelyn Stericker](https://nettek.ca).
Las modificaciones de escritorio son © 2024 - present [José Luis Miralles Bono](https://www.jlmirall.es).

Consulta [LICENSE.txt](LICENSE.txt) para la GPL completa y [LICENSE.AGPL.txt](LICENSE.AGPL.txt) para la AGPL.

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Haz un fork, abre un _issue_ o envía un PR.
El código fuente del fork está en: [github.com/JLMirallesB/hacklily](https://github.com/JLMirallesB/hacklily)
