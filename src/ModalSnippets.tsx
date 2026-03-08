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
  ButtonGroup,
  Classes,
  Dialog,
  FormGroup,
  InputGroup,
  Menu,
  MenuItem,
  NonIdealState,
  Spinner,
  Tab,
  Tabs,
  Tag,
} from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

import { fetchUrl, readSnippetsFile, writeSnippetsFile } from "./electronBridge";

const SNIPPETS_BASE = "https://lilypond.org/doc/v2.24/Documentation/snippets/";
const SNIPPETS_INDEX = `${SNIPPETS_BASE}index`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OfficialCategory {
  name: string;
  href: string;
}

interface OfficialSnippet {
  title: string;
  code: string;
}

interface MySnippet {
  name: string;
  code: string;
}

type MySnippets = Record<string, MySnippet[]>;

interface Props {
  /** The code currently in the editor (for saving as a snippet). */
  currentCode: string;
  onHide(): void;
  /** Called when the user wants to load a snippet into the editor. */
  onLoadSrc(src: string): void;
}

interface State {
  activeTab: string;

  // --- Official snippets ---
  officialLoading: boolean;
  officialError: string | null;
  officialCategories: OfficialCategory[];
  officialSelected: OfficialCategory | null;
  officialSnippets: OfficialSnippet[];
  officialSnippetsLoading: boolean;
  officialSnippetsError: string | null;

  // --- My snippets ---
  myLoading: boolean;
  mySnippets: MySnippets;

  // Save-as-snippet inline form
  showSaveForm: boolean;
  saveName: string;
  saveCategory: string;
  saving: boolean;
}

// ---------------------------------------------------------------------------
// HTML parsers
// ---------------------------------------------------------------------------

function parseOfficialIndex(html: string): OfficialCategory[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const seen = new Set<string>();
  const cats: OfficialCategory[] = [];

  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    // Only local .html links (no slashes, no external URLs, no anchors)
    if (
      href.endsWith(".html") &&
      !href.startsWith("http") &&
      !href.includes("/") &&
      !href.startsWith("#") &&
      !seen.has(href)
    ) {
      seen.add(href);
      const name = a.textContent?.trim() ?? href;
      if (name) cats.push({ name, href });
    }
  });

  return cats;
}

function parseOfficialCategory(html: string): OfficialSnippet[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const snippets: OfficialSnippet[] = [];

  doc.querySelectorAll("pre.verbatim, pre.example").forEach((pre) => {
    const code = pre.textContent?.trim() ?? "";
    // Only include blocks that look like LilyPond source
    if (!code.includes("\\") && !code.includes("{")) return;

    // Walk upwards/backwards in the DOM to find the closest heading
    let title = "Snippet";
    let el: Element | null = pre;
    outer: while (el) {
      let sib: Element | null = el.previousElementSibling;
      while (sib) {
        if (/^h[2-6]$/i.test(sib.tagName)) {
          // Strip leading numbering (e.g. "1.2.3 ")
          title =
            sib.textContent?.trim().replace(/^[\d.\s]+/, "") ?? title;
          break outer;
        }
        sib = sib.previousElementSibling;
      }
      el = el.parentElement;
    }

    snippets.push({ title, code });
  });

  return snippets;
}

// ---------------------------------------------------------------------------
// Personal snippets markdown parser/serializer
// ---------------------------------------------------------------------------

function parseMySnippets(md: string): MySnippets {
  const result: MySnippets = {};
  let currentCategory = "General";
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      currentCategory = line.slice(2).trim();
      if (!result[currentCategory]) result[currentCategory] = [];
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      const name = line.slice(3).trim();
      i++;
      // Advance to opening code fence
      while (i < lines.length && !lines[i].startsWith("```")) i++;
      i++; // skip the ``` line
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      if (!result[currentCategory]) result[currentCategory] = [];
      result[currentCategory].push({ name, code: codeLines.join("\n") });
      continue;
    }

    i++;
  }

  return result;
}

function serializeMySnippets(snippets: MySnippets): string {
  return Object.entries(snippets)
    .map(([cat, items]) => {
      const itemsStr = items
        .map((s) => `## ${s.name}\n\`\`\`lilypond\n${s.code}\n\`\`\``)
        .join("\n\n");
      return `# ${cat}\n\n${itemsStr}`;
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default class ModalSnippets extends React.PureComponent<Props, State> {
  state: State = {
    activeTab: "official",

    officialLoading: true,
    officialError: null,
    officialCategories: [],
    officialSelected: null,
    officialSnippets: [],
    officialSnippetsLoading: false,
    officialSnippetsError: null,

    myLoading: false,
    mySnippets: {},

    showSaveForm: false,
    saveName: "",
    saveCategory: "",
    saving: false,
  };

  componentDidMount(): void {
    void this.loadOfficialIndex();
    void this.loadMySnippets();
  }

  render(): JSX.Element {
    const { onHide } = this.props;
    const { activeTab } = this.state;

    return (
      <Dialog
        isOpen={true}
        onClose={onHide}
        title="Snippets"
        style={{ width: "85vw", maxWidth: 1000 }}
      >
        <div
          className={Classes.DIALOG_BODY}
          style={{ padding: 0, overflow: "hidden" }}
        >
          <Tabs
            id="snippets-tabs"
            selectedTabId={activeTab}
            onChange={(tab) => this.setState({ activeTab: String(tab) })}
            renderActiveTabPanelOnly={false}
          >
            <Tab
              id="official"
              title="LilyPond Official"
              panel={this.renderOfficialTab()}
              panelClassName={css(styles.tabPanel)}
            />
            <Tab
              id="mine"
              title="Mis Snippets"
              panel={this.renderMyTab()}
              panelClassName={css(styles.tabPanel)}
            />
          </Tabs>
        </div>
      </Dialog>
    );
  }

  // -------------------------------------------------------------------------
  // Official snippets tab
  // -------------------------------------------------------------------------

  private renderOfficialTab(): JSX.Element {
    const {
      officialLoading,
      officialError,
      officialCategories,
      officialSelected,
      officialSnippets,
      officialSnippetsLoading,
      officialSnippetsError,
    } = this.state;

    let categoryContent: React.ReactNode;
    if (officialLoading) {
      categoryContent = (
        <div className={css(styles.center)}>
          <Spinner size={24} />
          <p style={{ marginTop: 8, color: "#888" }}>Cargando…</p>
        </div>
      );
    } else if (officialError) {
      categoryContent = (
        <NonIdealState
          icon="offline"
          title="Sin conexión"
          description={officialError}
          action={
            <Button
              icon="refresh"
              small
              onClick={() => void this.loadOfficialIndex()}
            >
              Reintentar
            </Button>
          }
        />
      );
    } else {
      categoryContent = (
        <Menu>
          {officialCategories.map((cat) => (
            <MenuItem
              key={cat.href}
              text={cat.name}
              active={officialSelected?.href === cat.href}
              onClick={() => void this.loadOfficialCategory(cat)}
            />
          ))}
        </Menu>
      );
    }

    let snippetsContent: React.ReactNode;
    if (!officialSelected) {
      snippetsContent = (
        <NonIdealState
          icon="arrow-left"
          title="Selecciona una categoría"
          description="Elige una categoría de la lista de la izquierda para ver sus snippets."
        />
      );
    } else if (officialSnippetsLoading) {
      snippetsContent = (
        <div className={css(styles.center)}>
          <Spinner size={24} />
          <p style={{ marginTop: 8, color: "#888" }}>Cargando snippets…</p>
        </div>
      );
    } else if (officialSnippetsError) {
      snippetsContent = (
        <NonIdealState
          icon="error"
          title="Error"
          description={officialSnippetsError}
        />
      );
    } else if (officialSnippets.length === 0) {
      snippetsContent = (
        <NonIdealState
          icon="search"
          title="Sin resultados"
          description="No se encontraron snippets en esta categoría."
        />
      );
    } else {
      snippetsContent = officialSnippets.map((snippet, idx) => (
        <div key={idx} className={css(styles.snippetCard)}>
          <div className={css(styles.snippetHeader)}>
            <span className={css(styles.snippetTitle)}>{snippet.title}</span>
            <Button
              icon="import"
              small
              intent="primary"
              onClick={() => this.handleLoadSnippet(snippet.code)}
            >
              Cargar
            </Button>
          </div>
          <pre className={css(styles.codePreview)}>
            {snippet.code.split("\n").slice(0, 6).join("\n")}
            {snippet.code.split("\n").length > 6 ? "\n…" : ""}
          </pre>
        </div>
      ));
    }

    return (
      <div className={css(styles.twoPanel)}>
        <div className={css(styles.categoryPanel)}>{categoryContent}</div>
        <div className={css(styles.snippetsPanel)}>{snippetsContent}</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // My snippets tab
  // -------------------------------------------------------------------------

  private renderMyTab(): JSX.Element {
    const {
      myLoading,
      mySnippets,
      showSaveForm,
      saveName,
      saveCategory,
      saving,
    } = this.state;

    const categories = Object.keys(mySnippets);

    return (
      <div className={css(styles.myTabRoot)}>
        {/* Save form */}
        <div className={css(styles.saveBar)}>
          {!showSaveForm ? (
            <Button
              icon="floppy-disk"
              intent="success"
              onClick={() =>
                this.setState({
                  showSaveForm: true,
                  saveName: "",
                  saveCategory: categories[0] ?? "",
                })
              }
            >
              Guardar código actual como snippet
            </Button>
          ) : (
            <div className={css(styles.saveForm)}>
              <FormGroup label="Nombre del snippet" inline>
                <InputGroup
                  value={saveName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    this.setState({ saveName: e.target.value })
                  }
                  placeholder="Ej: Clave de sol con armadura"
                  style={{ width: 260 }}
                  autoFocus
                />
              </FormGroup>
              <FormGroup label="Categoría" inline>
                <InputGroup
                  value={saveCategory}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    this.setState({ saveCategory: e.target.value })
                  }
                  placeholder="Ej: Escalas"
                  style={{ width: 180 }}
                  list="snippet-categories"
                />
                <datalist id="snippet-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </FormGroup>
              <ButtonGroup>
                <Button
                  icon="tick"
                  intent="success"
                  disabled={!saveName.trim() || !saveCategory.trim()}
                  loading={saving}
                  onClick={() => void this.handleSaveSnippet()}
                >
                  Guardar
                </Button>
                <Button
                  icon="cross"
                  onClick={() => this.setState({ showSaveForm: false })}
                >
                  Cancelar
                </Button>
              </ButtonGroup>
            </div>
          )}
        </div>

        {/* Snippet list */}
        <div className={css(styles.mySnippetsList)}>
          {myLoading ? (
            <div className={css(styles.center)}>
              <Spinner size={24} />
            </div>
          ) : categories.length === 0 ? (
            <NonIdealState
              icon="bookmark"
              title="Sin snippets guardados"
              description="Guarda el código actual usando el botón de arriba."
            />
          ) : (
            categories.map((cat) => (
              <div key={cat} className={css(styles.myCategory)}>
                <h4 className={css(styles.myCategoryTitle)}>
                  <Tag minimal>{cat}</Tag>
                </h4>
                {mySnippets[cat].map((snippet, idx) => (
                  <div key={idx} className={css(styles.snippetCard)}>
                    <div className={css(styles.snippetHeader)}>
                      <span className={css(styles.snippetTitle)}>
                        {snippet.name}
                      </span>
                      <ButtonGroup minimal>
                        <Button
                          icon="import"
                          small
                          intent="primary"
                          onClick={() => this.handleLoadSnippet(snippet.code)}
                        >
                          Cargar
                        </Button>
                        <Button
                          icon="trash"
                          small
                          intent="danger"
                          onClick={() =>
                            void this.handleDeleteSnippet(cat, idx)
                          }
                        />
                      </ButtonGroup>
                    </div>
                    <pre className={css(styles.codePreview)}>
                      {snippet.code.split("\n").slice(0, 5).join("\n")}
                      {snippet.code.split("\n").length > 5 ? "\n…" : ""}
                    </pre>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  private handleLoadSnippet = (code: string): void => {
    this.props.onLoadSrc(code);
    this.props.onHide();
  };

  private async loadOfficialIndex(): Promise<void> {
    this.setState({ officialLoading: true, officialError: null });
    try {
      const result = await fetchUrl(SNIPPETS_INDEX);
      if (!result || !result.ok) {
        this.setState({
          officialLoading: false,
          officialError:
            result?.text ??
            "No se pudo conectar al servidor de LilyPond. Comprueba la conexión a internet.",
        });
        return;
      }
      const cats = parseOfficialIndex(result.text);
      this.setState({
        officialLoading: false,
        officialCategories: cats,
        officialError: cats.length === 0 ? "No se encontraron categorías." : null,
      });
    } catch (err) {
      this.setState({
        officialLoading: false,
        officialError: err instanceof Error ? err.message : "Error de red.",
      });
    }
  }

  private async loadOfficialCategory(cat: OfficialCategory): Promise<void> {
    this.setState({
      officialSelected: cat,
      officialSnippetsLoading: true,
      officialSnippetsError: null,
      officialSnippets: [],
    });
    try {
      const url = `${SNIPPETS_BASE}${cat.href}`;
      const result = await fetchUrl(url);
      if (!result || !result.ok) {
        this.setState({
          officialSnippetsLoading: false,
          officialSnippetsError: "No se pudo cargar la categoría.",
        });
        return;
      }
      const snippets = parseOfficialCategory(result.text);
      this.setState({
        officialSnippetsLoading: false,
        officialSnippets: snippets,
      });
    } catch (err) {
      this.setState({
        officialSnippetsLoading: false,
        officialSnippetsError:
          err instanceof Error ? err.message : "Error al cargar snippets.",
      });
    }
  }

  private async loadMySnippets(): Promise<void> {
    this.setState({ myLoading: true });
    const content = await readSnippetsFile();
    if (content) {
      this.setState({ mySnippets: parseMySnippets(content), myLoading: false });
    } else {
      this.setState({ mySnippets: {}, myLoading: false });
    }
  }

  private async handleSaveSnippet(): Promise<void> {
    const { saveName, saveCategory } = this.state;
    const { currentCode } = this.props;
    if (!saveName.trim() || !saveCategory.trim()) return;

    this.setState({ saving: true });

    const updated: MySnippets = { ...this.state.mySnippets };
    if (!updated[saveCategory]) updated[saveCategory] = [];
    updated[saveCategory] = [
      ...updated[saveCategory],
      { name: saveName.trim(), code: currentCode },
    ];

    await writeSnippetsFile(serializeMySnippets(updated));

    this.setState({
      mySnippets: updated,
      showSaveForm: false,
      saveName: "",
      saveCategory: "",
      saving: false,
    });
  }

  private async handleDeleteSnippet(
    category: string,
    idx: number,
  ): Promise<void> {
    if (
      !window.confirm(
        `¿Eliminar el snippet "${this.state.mySnippets[category][idx].name}"?`,
      )
    ) {
      return;
    }

    const updated: MySnippets = { ...this.state.mySnippets };
    updated[category] = updated[category].filter((_, i) => i !== idx);
    if (updated[category].length === 0) delete updated[category];

    await writeSnippetsFile(serializeMySnippets(updated));
    this.setState({ mySnippets: updated });
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tabPanel: {
    padding: 0,
  },
  twoPanel: {
    display: "flex",
    height: 520,
    overflow: "hidden",
  },
  categoryPanel: {
    width: 220,
    flexShrink: 0,
    borderRight: "1px solid rgba(255,255,255,0.1)",
    overflowY: "auto",
    padding: "4px 0",
  },
  snippetsPanel: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: 24,
  },
  snippetCard: {
    marginBottom: 12,
    padding: "8px 10px",
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.15)",
  },
  snippetHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  snippetTitle: {
    fontWeight: 600,
    fontSize: "0.9em",
    flex: 1,
    marginRight: 8,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  codePreview: {
    margin: 0,
    fontSize: "0.78em",
    fontFamily: "monospace",
    opacity: 0.75,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.4,
    maxHeight: 100,
    overflow: "hidden",
  },
  myTabRoot: {
    display: "flex",
    flexDirection: "column",
    height: 520,
    overflow: "hidden",
  },
  saveBar: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  saveForm: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  mySnippetsList: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
  },
  myCategory: {
    marginBottom: 16,
  },
  myCategoryTitle: {
    margin: "0 0 6px 0",
    fontSize: "0.85em",
  },
});
