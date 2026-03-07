# Guía de lanzamiento (no técnica) - Hacklily Desktop

Este repositorio ya está preparado para entregar binarios de la opción 2:

- macOS: archivo `.dmg`
- Windows: instalador `.exe`
- Experiencia final: usuario instala y abre una app normal, sin Docker.

## Qué hace el equipo técnico antes de publicar

1. Colocar el runtime de LilyPond en `desktop/runtime/templates/...` (mac y Windows).
2. En GitHub Actions, ejecutar **Create Hacklily Desktop Release Tag** con versión `X.Y.Z`.
3. Esto crea el tag `desktop-vX.Y.Z`.
4. Ese tag dispara automáticamente el workflow de build de instaladores.
5. Los binarios `.dmg` y `.exe` quedan adjuntos en la GitHub Release del tag.
6. Publicar notas de versión y checksum.

## Qué recibe el usuario final

1. Descarga instalador.
2. Instala app.
3. Abre app y trabaja offline.

## Alcance funcional

- Editor y render local offline.
- Integración GitHub desactivada en este modo offline.

## Cumplimiento de licencia (obligatorio)

Como este producto deriva de GPL/AGPL:

- Entregar los textos de licencia.
- Ofrecer acceso al código fuente correspondiente de la versión distribuida.
- Mantener avisos de copyright.

## Riesgos que conviene vigilar

- Tamaño del instalador (depende del runtime de LilyPond).
- Firma de código/notarización para evitar alertas en macOS/Windows.
- Pruebas de humo por plataforma antes de cada publicación.
