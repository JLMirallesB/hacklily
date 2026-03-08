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

import { Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React from "react";

import { Auth } from "./auth";
import { isDesktop } from "./electronBridge";

interface Props {
  auth: Auth | null;
  canCreateNew: boolean;
  canExport: boolean;
  canSave: boolean;
  canSaveAs: boolean;
  songURL: string | null;
  colourScheme: "vs-dark" | "vs";
  onExportLy(): any;
  onExportMIDI(): any;
  onExportPDF(): any;
  onExportSVG(): any;
  onExportPNG(): any;
  onDeleteSong(song: string): void;
  onLoadSong(song: string): void;
  onShowAbout(): void;
  onShowClone(): void;
  onShowMutopia(): void;
  onShowXmlImport(): void;
  onImportMidi(): void;
  onShowOpen(): void;
  onShowNew(): void;
  onShowPublish(): void;
  onSignIn(): void;
  onSignOut(): void;
  setColourScheme(colourScheme: "vs-dark" | "vs"): void;
}

/**
 * Renders the File menu.
 * The menu button is rendered by <Header />
 */
export default class FileMenu extends React.PureComponent<Props> {
  render(): JSX.Element {
    const {
      auth,
      canCreateNew,
      canExport,
      canSave,
      canSaveAs,
      onSignOut,
      onShowAbout,
      onShowClone,
      onShowMutopia,
      onShowXmlImport,
      onImportMidi,
      onShowOpen,
      onExportLy,
      onExportMIDI,
      onExportPDF,
      onExportSVG,
      onExportPNG,
      onShowNew,
      onShowPublish,
      songURL,
    } = this.props;

    let signOut: React.ReactNode;
    if (auth) {
      signOut = <MenuItem onClick={onSignOut} icon="log-out" text="Sign out" />;
    }

    const tutorial: React.ReactNode = (
      <MenuItem
        href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
        rel="noopener noreferrer"
        target="_blank"
        text="LilyPond manual&hellip;"
        icon="help"
      />
    );

    const about: React.ReactNode = (
      <MenuItem
        onClick={onShowAbout}
        text="About Hacklily Desktop"
        icon="info-sign"
      />
    );

    const checkUpdates: React.ReactNode = (
      <MenuItem
        href="https://github.com/JLMirallesB/hacklily/releases/latest"
        target="_blank"
        rel="noopener noreferrer"
        text="Check for updates&hellip;"
        icon="updated"
      />
    );

    const sourceCode: React.ReactNode = (
      <MenuItem
        href="https://github.com/JLMirallesB/hacklily"
        target="_blank"
        rel="noopener noreferrer"
        text="Source code&hellip;"
        icon="git-branch"
      />
    );

    return (
      <Menu>
        <MenuItem
          icon="add"
          text="New song"
          onClick={onShowNew}
          disabled={!canCreateNew}
        />
        <MenuDivider />
        <MenuItem
          icon="document-open"
          text="Open&hellip;"
          onClick={onShowOpen}
        />
        {/* ── Import submenu ────────────────────────────────────────── */}
        <MenuItem icon="import" text="Import">
          <MenuItem
            icon="music"
            text="Browse MutopiaProject&hellip;"
            onClick={onShowMutopia}
          />
          <MenuItem
            icon="code"
            text="Import MusicXML&hellip;"
            onClick={onShowXmlImport}
          />
          {isDesktop() && (
            <MenuItem
              icon="music"
              text="Import MIDI&hellip;"
              onClick={onImportMidi}
            />
          )}
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon="floppy-disk"
          text="Save"
          disabled={!canSave}
          onClick={onShowPublish}
        />
        <MenuItem
          icon="duplicate"
          text="Save as&hellip;"
          onClick={onShowClone}
          disabled={!canSaveAs}
        />
        {/* ── Export submenu ────────────────────────────────────────── */}
        <MenuItem icon="download" text="Export" disabled={!canExport}>
          <MenuItem onClick={onExportLy} icon="code" text="LilyPond source" />
          <MenuDivider />
          <MenuItem onClick={onExportPDF} icon="document-share" text="PDF" />
          <MenuItem onClick={onExportSVG} icon="shapes" text="SVG" />
          <MenuItem onClick={onExportPNG} icon="media" text="PNG" />
          <MenuDivider />
          <MenuItem onClick={onExportMIDI} icon="music" text="MIDI" />
          {songURL && <MenuDivider />}
          {songURL && (
            <MenuItem
              href={songURL.replace(/\.ly$/, ".pdf")}
              icon="git-repo"
              text="View on GitHub"
            />
          )}
        </MenuItem>
        <MenuDivider />
        {this.renderSetColourScheme()}
        {signOut}
        <MenuDivider />
        {tutorial}
        {checkUpdates}
        {sourceCode}
        {about}
      </Menu>
    );
  }

  private handleColourSchemeToggled = (): void => {
    const newColourScheme: "vs-dark" | "vs" =
      this.props.colourScheme === "vs-dark" ? "vs" : "vs-dark";

    this.props.setColourScheme(newColourScheme);
  };

  private renderSetColourScheme(): React.ReactNode {
    const text: string =
      this.props.colourScheme === "vs-dark"
        ? "Use light colour scheme"
        : "Use dark colour scheme";

    return (
      <MenuItem
        onClick={this.handleColourSchemeToggled}
        icon="lightbulb"
        text={text}
      />
    );
  }
}
