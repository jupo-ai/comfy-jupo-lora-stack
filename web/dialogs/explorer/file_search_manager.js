import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";
import { ViewModeManager } from "./view_mode_manager.js";

loadCSS("dialogs/explorer/css/file_search.css");

// ==============================================
// ファイル検索機能を管理するクラス
// ==============================================
export class FileSearchManager {
    constructor(parent) {
        this.parent = parent;
        this.element = null;

        this.searchTerm = "";
        this.searchResults = [];
        this.isSearching = false;

        this.createUI();
    }

    createUI() {
        this.element = $el("div.jupo-file-explorer-search-container");

        this.searchInput = $el("input.jupo-file-explorer-search-input", {
            type: "text",
            placeholder: "ファイル名で検索..."
        });

        this.clearButton = $el("button.jupo-file-explorer-search-clear-button", {
            textContent: "クリア",
            style: { display: "none" }
        });

        this.searchResultsInfo = $el("div.jupo-file-explorer-search-info", {
            style: { display: "none" }
        });

        this.element.append(
            this.searchInput,
            this.clearButton,
            this.searchResultsInfo
        );

        this.searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
        this.searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.clearSearch();
        });
        this.clearButton.addEventListener("click", () => this.clearSearch());
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim().toLowerCase();
        if (this.searchTerm === "") {
            this.clearSearch();
            return;
        }
        this.isSearching = true;
        this.performSearch();
        this.updateSearchUI();
    }

    performSearch() {
        this.searchResults = [];
        for (const [directoryPath, files] of Object.entries(this.parent.fileData.files)) {
            for (const fileName of files) {
                if (fileName.toLowerCase().includes(this.searchTerm)) {
                    const fullPath = directoryPath === "." ? fileName : `${directoryPath}/${fileName}`;
                    this.searchResults.push({ fullPath, fileName, directoryPath });
                }
            }
        }
        this.displaySearchResults();
    }

    displaySearchResults() {
        this.parent.fileContainer.replaceChildren();
        this.parent.fileContainer.classList.remove("jupo-file-explorer-files-grid", "jupo-file-explorer-files-list");

        if (this.searchResults.length === 0) {
            this.showEmpty();
            return;
        }

        const groupedResults = this.groupResultsByDirectory();

        for (const [directoryPath, files] of Object.entries(groupedResults)) {
            if (Object.keys(groupedResults).length > 1) {
                const dirHeader = $el("div.jupo-file-explorer-search-directory-header", {
                    textContent: `📁 ${directoryPath === "." ? "/ (root)" : directoryPath}`
                });
                this.parent.fileContainer.append(dirHeader);
            }

            const resultsContainer = ViewModeManager.viewMode === 'grid'
                ? $el("div.jupo-file-explorer-search-results-grid")
                : this.parent.fileContainer;

            files.forEach(result => {
                const element = this.parent.renderer.createFileElement(result.fullPath, result.fileName);
                this.highlightSearchTerm(element, result.fileName);
                resultsContainer.append(element);
            });

            if (ViewModeManager.viewMode === 'grid') {
                this.parent.fileContainer.append(resultsContainer);
            }
        }
    }

    showEmpty() {
        const empty = $el("p.jupo-file-explorer-no-files", {
            textContent: `"${this.searchTerm}" に一致するファイルが見つかりませんでした`
        });
        this.parent.fileContainer.append(empty);
    }

    groupResultsByDirectory() {
        const grouped = {};
        this.searchResults.forEach(result => {
            if (!grouped[result.directoryPath]) {
                grouped[result.directoryPath] = [];
            }
            grouped[result.directoryPath].push(result);
        });
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === ".") return -1;
            if (b === ".") return 1;
            return a.localeCompare(b);
        });
        const sortedGrouped = {};
        sortedKeys.forEach(key => {
            sortedGrouped[key] = grouped[key].sort((a, b) => a.fileName.localeCompare(b.fileName));
        });
        return sortedGrouped;
    }

    highlightSearchTerm(element, fileName) {
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;

        if (this.searchTerm) {
            const regex = new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const highlightedText = nameWithoutExt.replace(regex, '<mark>$1</mark>');

            if (ViewModeManager.viewMode === "list") {
                const nameSpan = element.querySelector('.jupo-file-explorer-file-list-name');
                if (nameSpan) nameSpan.innerHTML = highlightedText;
            } else {
                const overlayTextSpan = element.querySelector('.jupo-file-explorer-grid-text-overlay span');
                if (overlayTextSpan) overlayTextSpan.innerHTML = highlightedText;
            }
        }
    }

    updateSearchUI() {
        if (this.isSearching) {
            this.clearButton.style.display = "inline-block";
            this.searchResultsInfo.style.display = "block";
            this.searchResultsInfo.textContent = `${this.searchResults.length}件のファイルが見つかりました`;

            this.parent.treeContainer.style.opacity = "0.5";
            this.parent.treeContainer.style.pointerEvents = "none";
        } else {
            this.clearButton.style.display = "none";
            this.searchResultsInfo.style.display = "none";

            this.parent.treeContainer.style.opacity = "1";
            this.parent.treeContainer.style.pointerEvents = "auto";
        }
    }

    clearSearch() {
        this.searchTerm = "";
        this.searchResults = [];
        this.isSearching = false;
        this.searchInput.value = "";

        this.updateSearchUI();
        
        this.parent.displayFiles(this.parent.currentDirectoryPath);
        this.parent.viewModeManager.updateViewButtons();
    }
    
    focusSearchInput() {
        setTimeout(() => this.searchInput.focus(), 100);
    }
}