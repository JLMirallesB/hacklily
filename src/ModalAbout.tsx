/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

import {
  AnchorButton,
  Button,
  Classes,
  Dialog,
  Intent,
} from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

interface Props {
  onHide(): void;
}

const APP_VERSION = process.env.REACT_APP_VERSION ?? "";
const RELEASES_URL = "https://github.com/JLMirallesB/hacklily/releases/latest";
const SOURCE_URL = "https://github.com/JLMirallesB/hacklily";

/**
 * The About dialog for Hacklily Desktop.
 */
class ModalAbout extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <Dialog
        icon="info-sign"
        isOpen={true}
        onClose={this.props.onHide}
        title="About Hacklily Desktop"
        className={css(styles.modal)}
      >
        <div className={Classes.DIALOG_BODY}>
          <p className={Classes.TEXT_LARGE}>
            <strong>Hacklily Desktop</strong>
            {APP_VERSION && (
              <span
                className={Classes.TEXT_MUTED}
                style={{ fontWeight: "normal", marginLeft: 8 }}
              >
                v{APP_VERSION}
              </span>
            )}
          </p>
          <p>
            Editor de partituras{" "}
            <a
              href="http://lilypond.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LilyPond
            </a>{" "}
            que funciona <strong>completamente offline</strong>. El renderizado
            se realiza en local, sin depender de servidores externos. Incluye
            un explorador integrado de{" "}
            <a
              href="https://www.mutopiaproject.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              MutopiaProject
            </a>
            .
          </p>
          <p>
            ¿Nuevo en LilyPond? Consulta el{" "}
            <a
              href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
              target="_blank"
              rel="noopener noreferrer"
            >
              tutorial oficial
            </a>
            .
          </p>
          <div
            className={`${Classes.TEXT_SMALL} ${Classes.TEXT_MUTED}`}
            style={{ position: "relative" }}
          >
            <p>
              Fork del proyecto original{" "}
              <a
                href="https://github.com/emilyskidsister/hacklily"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hacklily
              </a>{" "}
              de{" "}
              <a
                href="https://nettek.ca"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jocelyn Stericker
              </a>
              .
              <br />
              Versión de escritorio creada por{" "}
              <a
                href="https://www.jlmirall.es"
                target="_blank"
                rel="noopener noreferrer"
              >
                José Luis Miralles Bono
              </a>
              .
            </p>
            <p>
              <a
                href="https://ko-fi.com/miralles"
                target="_blank"
                rel="noopener noreferrer"
              >
                ☕ Invítame a un café en Ko-fi
              </a>
            </p>
            <p style={{ marginBottom: 0 }}>
              Este proyecto es{" "}
              <a
                href="https://www.fsf.org/about/what-is-free-software"
                target="_blank"
                rel="noopener noreferrer"
              >
                software libre
              </a>
              , distribuido bajo los términos de la GNU GPL v3 o posterior.{" "}
              <a
                href="https://www.gnu.org/licenses/gpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="gplv3-127x51.png"
                  alt="GNU GPL v3"
                  style={{ verticalAlign: "middle", marginLeft: 6 }}
                />
              </a>
            </p>
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={this.props.onHide}>Cerrar</Button>
            <AnchorButton
              href={SOURCE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              Código fuente
            </AnchorButton>
            <AnchorButton
              href={RELEASES_URL}
              intent={Intent.PRIMARY}
              rel="noopener noreferrer"
              target="_blank"
            >
              Buscar actualizaciones
            </AnchorButton>
          </div>
        </div>
      </Dialog>
    );
  }
}

export default ModalAbout;

const styles = StyleSheet.create({
  modal: {
    width: 565,
  },
});
