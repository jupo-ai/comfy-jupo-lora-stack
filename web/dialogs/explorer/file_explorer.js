import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";

import { BaseDialog } from "../base/base_dialog.js";
import { FileSearchManager } from "./file_search_manager.js";
import { ViewModeManager } from "./view_mode_manager.js";
import { FileRenderManager } from "./file_render_manager.js";

loadCSS("dialogs/explorer/css/file_explorer.css");


// ==============================================
// 汎用ファイルエクスプローラ
// ==============================================
export class FileExplorer extends BaseDialog {
    constructor(callback) {
        super();

        this.apiDir = null;
        this.infoDialog = null;

        this.fileData = null;
        this.callback = callback;
        this.currentDirectoryPath = ".";

        this.initializeManagers();
        this.createUI();
    }

    initializeManagers() {
        this.searchManager = new FileSearchManager(this);
        this.viewModeManager = new ViewModeManager(this);
        this.renderer = new FileRenderManager(this);
    }

    createUI() {
        this.container.classList.add("jupo-file-explorer");

        this.createHeader();
        this.createContent();
    }

    createHeader() {
        const header = $el("div.jupo-file-explorer-header");
        this.headerTitle = $el("div.jupo-file-explorer-header-title", {
            textContent: "ファイルを選択..."
        });
        this.featuresContainer = $el("div.jupo-file-explorer-header-features");
        this.featuresContainer.append(
            this.searchManager.element,
            this.viewModeManager.element
        );
        header.append(this.headerTitle, this.featuresContainer);

        this.container.append(header);
    }

    createContent() {
        this.treeContainer = $el("div.jupo-file-explorer-tree");
        this.fileContainer = $el("div.jupo-file-explorer-files");

        const leftPanel = $el("div.jupo-file-explorer-left-panel", [this.treeContainer]);
        const rightPanel = $el("div.jupo-file-explorer-right-panel", [this.fileContainer]);

        const content = $el("div.jupo-file-explorer-content", [leftPanel, rightPanel]);

        this.container.append(content);
    }

    show({ fileList, currentValue }) {
        super.show();

        try {
            this.fileData = this.parseFilePaths(fileList);

            this.treeContainer.replaceChildren();
            this.buildTree(this.fileData.tree, this.treeContainer, "");

            let initialPath = ".";
            if (currentValue) {
                const normalizedCurrentValue = currentValue.replace(/\\/g, '/');
                const lastSlash = normalizedCurrentValue.lastIndexOf('/');
                if (lastSlash !== -1) {
                    initialPath = normalizedCurrentValue.substring(0, lastSlash);
                }
            }

            this.displayFiles(initialPath);
            this.viewModeManager.updateViewButtons();
            
            const elementToActivate = this.openTreeToPath(initialPath);
            if (elementToActivate) {
                this.setActiveDirectory(elementToActivate);
            }

            // this.searchManager.focusSearchInput();

        } catch (error) {
            console.error("ファイルデータの読み込みに失敗しました: ", error);
            alert("ファイルデータの読み込みに失敗しました。コンソールを確認してください");
            this.close();
        }
    }
    
    parseFilePaths(fileList) {
        const tree = {};
        const files = {};

        for (const rawPath of fileList) {
            if (!rawPath) continue;

            const path = rawPath.replace(/\\/g, '/');
            const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
            let directoryPath;
            let fileName;

            if (lastSlash === -1) {
                directoryPath = ".";
                fileName = path;
            } else {
                directoryPath = path.substring(0, lastSlash);
                fileName = path.substring(lastSlash + 1);

                let currentNode = tree;
                const parts = directoryPath.split('/');
                for (const part of parts) {
                    if (!currentNode[part]) {
                        currentNode[part] = {};
                    }
                    currentNode = currentNode[part];
                }
            }

            if (!files[directoryPath]) {
                files[directoryPath] = [];
            }
            files[directoryPath].push(fileName);
        }
        return { tree, files };
    }

    buildTree(node, parentElement, currentPath) {
        const ul = $el("ul.jupo-file-explorer-tree-list");

        if (currentPath === "" && (this.fileData.files["."] || Object.keys(node).length > 0)) {
            const rootLi = $el("li.jupo-file-explorer-directory-item", [
                $el("span.jupo-file-explorer-expander-placeholder"),
                $el("span.jupo-file-explorer-folder-label", { textContent: "📁 / (root)" })
            ]);
            rootLi.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!this.searchManager.isSearching) {
                    this.setActiveDirectory(rootLi);
                    this.currentDirectoryPath = ".";
                    this.displayFiles(".");
                }
            });
            ul.appendChild(rootLi);
        }

        for (const dir of Object.keys(node).sort()) {
            const newPath = currentPath ? `${currentPath}/${dir}` : dir;
            const subNode = node[dir];
            const hasSubdirectories = Object.keys(subNode).length > 0;

            if (hasSubdirectories) {
                const summary = $el("summary.jupo-file-explorer-directory-summary", [
                    $el("span.jupo-file-explorer-expander", { textContent: "▶" }),
                    $el("span.jupo-file-explorer-folder-label", { textContent: `📁 ${dir}` })
                ]);
                summary.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (!this.searchManager.isSearching) {
                        this.setActiveDirectory(summary);
                        this.currentDirectoryPath = newPath;
                        this.displayFiles(newPath);
                    }
                });

                const details = $el("details.jupo-file-explorer-directory-details", [summary]);
                const subTreeContainer = $el("div.jupo-file-explorer-subtree");
                this.buildTree(subNode, subTreeContainer, newPath);
                details.appendChild(subTreeContainer);
                ul.appendChild($el("li", [details]));

            } else {
                const leafLi = $el("li.jupo-file-explorer-directory-item", [
                    $el("span.jupo-file-explorer-expander-placeholder"),
                    $el("span.jupo-file-explorer-folder-label", { textContent: `📁 ${dir}` })
                ]);
                leafLi.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (!this.searchManager.isSearching) {
                        this.setActiveDirectory(leafLi);
                        this.currentDirectoryPath = newPath;
                        this.displayFiles(newPath);
                    }
                });
                ul.appendChild(leafLi);
            }
        }
        parentElement.appendChild(ul);
    }

    // --- 新しいプライベートメソッド ---
    openTreeToPath(path) {
        let elementToActivate = this.treeContainer.querySelector('.jupo-file-explorer-directory-item'); // デフォルトはルート
        if (path === ".") {
            return elementToActivate;
        }

        const pathParts = path.split('/');
        let currentSearchElement = this.treeContainer;

        for (const part of pathParts) {
            const list = currentSearchElement.querySelector("ul.jupo-file-explorer-tree-list");
            if (!list) break;

            const foundLi = Array.from(list.children).find(li => {
                const label = li.querySelector(".jupo-file-explorer-folder-label");
                return label && label.textContent.trim() === `📁 ${part}`;
            });

            if (foundLi) {
                if (foundLi.classList.contains('jupo-file-explorer-directory-item')) {
                    elementToActivate = foundLi;
                    break;
                } else {
                    const summaryElement = foundLi.querySelector('.jupo-file-explorer-directory-summary');
                    if (summaryElement) {
                        elementToActivate = summaryElement;
                        const details = summaryElement.parentElement;
                        details.open = true;
                        currentSearchElement = details;
                    } else {
                        break;
                    }
                }
            } else {
                break;
            }
        }
        return elementToActivate;
    }

    setActiveDirectory(element) {
        this.treeContainer.querySelectorAll('.jupo-file-explorer-active-directory').forEach(el => el.classList.remove('jupo-file-explorer-active-directory'));
        element.classList.add('jupo-file-explorer-active-directory');
    }

    displayFiles(directoryPath) {
        if (this.searchManager.isSearching) return;

        this.currentDirectoryPath = directoryPath;
        this.fileContainer.replaceChildren();
        const files = this.fileData.files[directoryPath] || [];

        if (files.length === 0) {
            this.fileContainer.appendChild($el("p.jupo-file-explorer-no-files", { textContent: "このディレクトリにファイルはありません。" }));
            return;
        }

        files.sort().forEach(fileName => {
            const fullPath = directoryPath === "." ? fileName : `${directoryPath}/${fileName}`;
            const element = this.renderer.createFileElement(fullPath, fileName);
            this.fileContainer.appendChild(element);
        });
    }
}