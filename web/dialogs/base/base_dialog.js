import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";

loadCSS("dialogs/base/css/base_dialog.css");

const DEFAULT_Z_INDEX = 2000;

// ==============================================
// モーダルダイアログの基底クラス
// ==============================================
export class BaseDialog {
    constructor() {
        // UI要素
        this.overlay = null;        // 一番上の親(モーダル用のオーバーレイ)
        this.dialog = null;         // 全体コンテナ(ツールバー + コンテナ)
        this.toolbar = null;        // ツールバー
        this.closeButton = null;    // 閉じるボタン
        this.container = null;      // コンテンツコンテナ

        this.createBaseUI();
    }

    createBaseUI() {
        this.overlay = $el("div.jupo-dialog-overlay");
        this.overlay.addEventListener("mousedown", (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        this.dialog = $el("div.jupo-dialog");

        this.toolbar = $el("div.jupo-dialog-toolbar");

        this.closeButton = $el("button", { textContent: "×" });
        this.closeButton.addEventListener("click", () => this.close());

        this.toolbar.append(this.closeButton);

        this.container = $el("div.jupo-dialog-container");

        this.dialog.append(this.toolbar, this.container);
        this.overlay.append(this.dialog);
    }

    get_max_index(className) {
        const elements = document.body.querySelectorAll(className);
        const zIndexes = Array.from(elements).map(element => {
            return parseInt(window.getComputedStyle(element).zIndex, 10) || 0;
        });

        return zIndexes.length > 0 ? Math.max(...zIndexes) : DEFAULT_Z_INDEX;
    }

    show() {
        const zIndex = this.get_max_index(".jupo-dialog-overlay");
        this.overlay.style.zIndex = zIndex + 1;

        document.body.append(this.overlay);
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
        }
    }
}