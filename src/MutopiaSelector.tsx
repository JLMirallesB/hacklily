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
  Button,
  Classes,
  Dialog,
  HTMLTable,
  Icon,
  InputGroup,
  Spinner,
} from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

const REPO = "MutopiaProject/MutopiaProject";
const BRANCH = "master";
// All scores live under ftp/ — skip the noisy repo root.
const ROOT_PATH = "ftp";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

interface GHItem {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface PathEntry {
  name: string;
  path: string;
}

interface Props {
  onHide(): void;
  /** Load a fully-inlined LilyPond source directly into the editor. */
  onLoadSrc(src: string): void;
}

interface State {
  items: GHItem[] | null;
  /** Error while listing a directory. */
  error: string | null;
  /** Breadcrumb stack — empty means we're at ROOT_PATH. */
  pathStack: PathEntry[];
  filter: string;
  /** True while fetching + inlining a .ly file. */
  loadingFile: boolean;
  /** Error while fetching/inlining a .ly file. */
  fileError: string | null;
}

/**
 * Fetches a single raw .ly file and inlines any sibling \include "*.ly"
 * directives so the result is fully self-contained for the local renderer.
 *
 * Only simple relative includes (no path separators) are resolved; standard
 * LilyPond library includes are left untouched.
 */
async function fetchAndInline(filePath: string): Promise<string> {
  const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));

  const mainResp = await fetch(`${RAW_BASE}/${filePath}`);
  if (!mainResp.ok) {
    throw new Error(`Could not fetch file (HTTP ${mainResp.status})`);
  }
  let src = await mainResp.text();

  // Match \include "filename.ly" where filename has no path separators.
  // This targets sibling-file includes (violinoone.ly, cello.ly …) while
  // ignoring standard LilyPond library includes like "english.ly".
  const includeRe = /\\include\s+"([^/\\"]+\.ly)"/g;
  const matches = [...src.matchAll(includeRe)];

  await Promise.all(
    matches.map(async (match) => {
      const siblingName = match[1];
      const siblingPath = `${dirPath}/${siblingName}`;
      try {
        const sibResp = await fetch(`${RAW_BASE}/${siblingPath}`);
        if (!sibResp.ok) return; // leave the \include as-is
        const sibContent = await sibResp.text();
        src = src.replace(
          match[0],
          `% ── inlined: ${siblingName} ──────────────────\n` +
            sibContent +
            `\n% ── end: ${siblingName} ──────────────────`,
        );
      } catch {
        // Network error: leave the \include as-is
      }
    }),
  );

  return src;
}

/**
 * Dialog for browsing and opening scores from the MutopiaProject
 * repository. Navigates via the GitHub Contents API, then inlines
 * all sibling \include files so the local LilyPond renderer can
 * compile the score without needing access to the full repo.
 */
export default class MutopiaSelector extends React.Component<Props, State> {
  state: State = {
    items: null,
    error: null,
    pathStack: [],
    filter: "",
    loadingFile: false,
    fileError: null,
  };

  componentDidMount(): void {
    this.fetchDir(ROOT_PATH);
  }

  render(): JSX.Element {
    const { onHide } = this.props;
    const { loadingFile, fileError } = this.state;

    return (
      <Dialog
        title="Browse MutopiaProject"
        isOpen={true}
        onClose={onHide}
        className={css(styles.modal)}
        icon="music"
      >
        <div className={Classes.DIALOG_BODY + " " + css(styles.body)}>
          {this.renderBreadcrumb()}
          <InputGroup
            leftIcon="search"
            placeholder="Filter…"
            value={this.state.filter}
            onChange={this.handleFilterChange}
            className={css(styles.search)}
            disabled={loadingFile}
          />
          <div className={css(styles.listContainer)}>
            {loadingFile ? (
              <div className={css(styles.placeholder)}>
                <Spinner />
                <span className={css(styles.loadingLabel)}>
                  Loading score…
                </span>
              </div>
            ) : fileError ? (
              <div className={css(styles.placeholder)}>
                <span className={css(styles.errorText)}>{fileError}</span>
              </div>
            ) : (
              this.renderContent()
            )}
          </div>
        </div>
      </Dialog>
    );
  }

  private renderBreadcrumb(): React.ReactNode {
    const { pathStack, loadingFile } = this.state;

    return (
      <div className={css(styles.breadcrumb)}>
        <Button
          minimal={true}
          small={true}
          icon="home"
          text="Composers"
          onClick={this.handleNavigateRoot}
          title="MutopiaProject — all composers"
          disabled={loadingFile}
        />
        {pathStack.map((entry, i) => (
          <React.Fragment key={entry.path}>
            <Icon icon="chevron-right" className={css(styles.breadcrumbSep)} />
            <Button
              minimal={true}
              small={true}
              text={entry.name}
              onClick={() => this.handleNavigateTo(i)}
              disabled={loadingFile}
            />
          </React.Fragment>
        ))}
      </div>
    );
  }

  private renderContent(): React.ReactNode {
    const { items, error, filter } = this.state;

    if (error) {
      return <div className={css(styles.placeholder)}>{error}</div>;
    }

    if (!items) {
      return (
        <div className={css(styles.placeholder)}>
          <Spinner />
        </div>
      );
    }

    const q = filter.trim().toLowerCase();
    const visible = items.filter(
      (item) =>
        (item.type === "dir" || item.name.endsWith(".ly")) &&
        (!q || item.name.toLowerCase().includes(q)),
    );

    if (!visible.length) {
      return (
        <div className={css(styles.placeholder)}>
          {q ? `No results for "${filter}".` : "Empty directory."}
        </div>
      );
    }

    return (
      <HTMLTable
        condensed={true}
        interactive={true}
        striped={true}
        className={css(styles.table)}
      >
        <tbody>
          {visible.map((item) => (
            <tr key={item.path} onClick={() => this.handleItemClick(item)}>
              <td>
                <Icon
                  icon={item.type === "dir" ? "folder-close" : "document"}
                  className={css(styles.icon)}
                />
                {item.name}
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    );
  }

  private fetchDir = async (path: string): Promise<void> => {
    this.setState({ items: null, error: null, filter: "", fileError: null });

    try {
      const url = `${API_BASE}/${path}?ref=${BRANCH}`;
      const resp = await fetch(url, {
        headers: { Accept: "application/vnd.github.v3+json" },
      });

      if (!resp.ok) {
        throw new Error(`GitHub API returned ${resp.status}`);
      }

      const data: GHItem[] = await resp.json();

      // Dirs first, then .ly files, both sorted alphabetically.
      data.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      this.setState({ items: data });
    } catch (e) {
      this.setState({
        error:
          e instanceof Error
            ? `Could not load directory: ${e.message}`
            : "Could not load directory.",
      });
    }
  };

  private handleItemClick = async (item: GHItem): Promise<void> => {
    if (item.type === "dir") {
      this.setState((prev) => ({
        pathStack: [...prev.pathStack, { name: item.name, path: item.path }],
        fileError: null,
      }));
      this.fetchDir(item.path);
      return;
    }

    // It's a .ly file — fetch it and inline all sibling \includes.
    this.setState({ loadingFile: true, fileError: null });
    try {
      const src = await fetchAndInline(item.path);
      this.props.onLoadSrc(src);
      this.props.onHide();
    } catch (e) {
      this.setState({
        loadingFile: false,
        fileError:
          e instanceof Error
            ? `Could not load score: ${e.message}`
            : "Could not load score.",
      });
    }
  };

  private handleNavigateRoot = (): void => {
    this.setState({ pathStack: [], fileError: null });
    this.fetchDir(ROOT_PATH);
  };

  private handleNavigateTo = (stackIndex: number): void => {
    const newStack = this.state.pathStack.slice(0, stackIndex + 1);
    const target = newStack[newStack.length - 1];
    this.setState({ pathStack: newStack, fileError: null });
    this.fetchDir(target.path);
  };

  private handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    this.setState({ filter: e.target.value });
  };
}

const styles = StyleSheet.create({
  modal: {
    width: 560,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingBottom: 0,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    minHeight: 30,
  },
  breadcrumbSep: {
    color: "#888",
    marginLeft: 2,
    marginRight: 2,
  },
  search: {
    flexShrink: 0,
  },
  listContainer: {
    flex: 1,
    height: 340,
    overflowY: "auto",
    borderTop: "1px solid rgba(16,22,26,.15)",
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: "100%",
    color: "#888",
  },
  loadingLabel: {
    fontSize: 13,
  },
  errorText: {
    color: "#c23030",
    textAlign: "center",
    padding: "0 16px",
  },
  table: {
    tableLayout: "fixed",
    width: "100%",
  },
  icon: {
    marginRight: 8,
  },
});
