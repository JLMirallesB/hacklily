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
  onLoadSong(song: string): void;
}

interface State {
  items: GHItem[] | null;
  error: string | null;
  pathStack: PathEntry[];
  filter: string;
}

/**
 * Dialog for browsing and opening scores from the MutopiaProject
 * repository on GitHub. Navigates the repo tree via the GitHub
 * Contents API and loads selected .ly files into the editor.
 */
export default class MutopiaSelector extends React.Component<Props, State> {
  state: State = {
    items: null,
    error: null,
    pathStack: [],
    filter: "",
  };

  componentDidMount(): void {
    this.fetchDir("");
  }

  render(): JSX.Element {
    const { onHide } = this.props;

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
          />
          <div className={css(styles.listContainer)}>
            {this.renderContent()}
          </div>
        </div>
      </Dialog>
    );
  }

  private renderBreadcrumb(): React.ReactNode {
    const { pathStack } = this.state;

    return (
      <div className={css(styles.breadcrumb)}>
        <Button
          minimal={true}
          small={true}
          icon="home"
          onClick={this.handleNavigateRoot}
          title="MutopiaProject root"
        />
        {pathStack.map((entry, i) => (
          <React.Fragment key={entry.path}>
            <Icon icon="chevron-right" className={css(styles.breadcrumbSep)} />
            <Button
              minimal={true}
              small={true}
              text={entry.name}
              onClick={() => this.handleNavigateTo(i)}
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
    this.setState({ items: null, error: null, filter: "" });

    try {
      const apiPath = path ? `/${path}` : "";
      const url = `https://api.github.com/repos/${REPO}/contents${apiPath}?ref=${BRANCH}`;
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

  private handleItemClick = (item: GHItem): void => {
    if (item.type === "dir") {
      this.setState((prev) => ({
        pathStack: [...prev.pathStack, { name: item.name, path: item.path }],
      }));
      this.fetchDir(item.path);
    } else {
      this.props.onLoadSong(`${REPO}/${item.path}`);
      this.props.onHide();
    }
  };

  private handleNavigateRoot = (): void => {
    this.setState({ pathStack: [] });
    this.fetchDir("");
  };

  private handleNavigateTo = (stackIndex: number): void => {
    const newStack = this.state.pathStack.slice(0, stackIndex + 1);
    const target = newStack[newStack.length - 1];
    this.setState({ pathStack: newStack });
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
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#888",
  },
  table: {
    tableLayout: "fixed",
    width: "100%",
  },
  icon: {
    marginRight: 8,
  },
});
