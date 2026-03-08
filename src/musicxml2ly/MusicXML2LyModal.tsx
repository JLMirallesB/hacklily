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

import { Classes, Dialog, Spinner, Callout } from "@blueprintjs/core";
import React from "react";

import RPCClient from "../RPCClient";

interface Props {
  rpc: RPCClient;
  onHide(): void;
  onResult(src: string): void;
}

interface State {
  loading: boolean;
  error: string | null;
}

export default class MusicXML2LyModal extends React.PureComponent<Props, State> {
  state: State = {
    loading: false,
    error: null,
  };

  render(): JSX.Element {
    const { loading, error } = this.state;

    return (
      <Dialog
        title="Import MusicXML"
        isOpen={true}
        onClose={loading ? undefined : this.props.onHide}
        canOutsideClickClose={!loading}
        canEscapeKeyClose={!loading}
      >
        <div className={Classes.DIALOG_BODY}>
          {error && (
            <Callout intent="danger" style={{ marginBottom: 12 }}>
              {error}
            </Callout>
          )}
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Spinner />
              <p style={{ marginTop: 12 }}>Converting MusicXML&hellip;</p>
            </div>
          ) : (
            <>
              <p>Select a MusicXML file to import into Hacklily.</p>
              <input type="file" accept=".xml,.musicxml,.mxl" onChange={this.convert} />
            </>
          )}
        </div>
      </Dialog>
    );
  }

  convert = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (!ev.target.files || ev.target.files.length === 0) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void this.doLoad(reader.result as string);
      reader.onload = null;
    };
    reader.readAsText(ev.target.files[0]);
  };

  doLoad = async (src: string): Promise<void> => {
    this.setState({ loading: true, error: null });
    try {
      const rendered = await this.props.rpc.call("render", {
        backend: "musicxml2ly",
        version: "stable",
        src,
      });

      const file: string | undefined = rendered.result?.files?.[0];
      if (!file) {
        this.setState({
          loading: false,
          error:
            "Conversion failed: musicxml2ly did not produce any output.
" +
            (rendered.result?.logs ?? ""),
        });
        return;
      }

      // Success — pass the LilyPond source to the parent and close
      this.props.onResult(file);
    } catch (err: unknown) {
      const rpcErr = err as { error?: { message?: string } };
      const msg = rpcErr?.error?.message ?? (err instanceof Error ? err.message : "Unknown error during MusicXML conversion.");
      this.setState({ loading: false, error: String(msg) });
    }
  };
}
