// Filename: trigger_section.js
import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";

loadCSS("dialogs/model_info/css/trigger_section.css");

// ==============================================
// Trigger Section
// ==============================================
export class TriggerSection {
    constructor(widget) {
        this.widget = widget;
        this.element = null;
        this.switchInput = null;
        this.buttons = null;
        this.textarea = null;
        this.overlay = null;

        this.createElements();
        this.bindEvents();
    }

    // ------------------------------------------
    // UI要素の作成
    // ------------------------------------------
    createElements() {
        this.element = $el("div.jupo-trigger-section");

        const title = $el("div.jupo-trigger-section-header-title", { textContent: "トリガーワード" });
        this.switchInput = $el("input.jupo-trigger-section-input", { type: "checkbox" });
        const switchElement = $el("label.jupo-trigger-section-switch", [
            this.switchInput,
            $el("span.jupo-trigger-section-slider")
        ]);
        const header = $el("div.jupo-trigger-section-header", [title, switchElement]);

        this.buttons = $el("div.jupo-trigger-section-buttons");
        this.textarea = $el("textarea.jupo-trigger-section-text-area", {
            placeholder: "トリガーワードをここに入力..."
        });
        this.overlay = $el("div.jupo-trigger-section-overlay", {
            textContent: "このエリアは使用できません"
        });

        this.element.append(header, this.buttons, this.textarea, this.overlay);
    }

    // ------------------------------------------
    // イベントリスナーの設定
    // ------------------------------------------
    bindEvents() {
        this.switchInput.addEventListener("change", () => this.handleSwitchChange());
        this.textarea.addEventListener("input", () => this.saveState());
    }

    // ------------------------------------------
    // オーバーレイの状態を更新
    // ------------------------------------------
    updateOverlayState() {
        this.overlay.style.display = this.widget ? "none" : "flex";
    }

    // ------------------------------------------
    // UIの状態（有効/無効）を更新
    // ------------------------------------------
    updateUIState() {
        const isEnabled = this.switchInput.checked;
        this.textarea.disabled = !isEnabled;
        this.element.classList.toggle("disabled", !isEnabled);
    }

    // ------------------------------------------
    // スイッチの状態が変更された時の処理
    // ------------------------------------------
    handleSwitchChange() {
        this.updateUIState();
        this.saveState();
    }

    // ------------------------------------------
    // 現在の状態をwidget.valueに保存
    // ------------------------------------------
    saveState() {
        if (!this.widget) return;
        this.widget.value = {
            ...this.widget.value,
            enabled_trigger: this.switchInput.checked,
            trigger: this.textarea.value
        };
    }

    // ------------------------------------------
    // テキストエリアにワードを挿入
    // ------------------------------------------
    insertWord(word) {
        let currentText = this.textarea.value.trim();
        
        // 既に入力されていた場合
        if (currentText) {
            if (!currentText.endsWith(",")) {
                currentText += ", ";
            } else {
                currentText += " ";
            }
        }

        this.textarea.value = currentText + word + ", ";
        this.textarea.focus();
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ------------------------------------------
    // ボタンエリアをクリア
    // ------------------------------------------
    clearButtons() {
        this.buttons.replaceChildren();
    }

    // ------------------------------------------
    // トリガーワードを表示 & 状態を復元
    // ------------------------------------------
    display(trainedWords) {
        this.clearButtons();
        this.updateOverlayState();

        // widget.valueから状態を復元
        if (this.widget && this.widget.value) {
            this.switchInput.checked = this.widget.value.enabled_trigger ?? false;
            this.textarea.value = this.widget.value.trigger ?? "";
        }

        // UIの状態を更新
        this.updateUIState();

        if (!trainedWords || trainedWords.length === 0) {
            this.showEmptyMessage();
            return;
        }

        trainedWords.forEach(word => {
            const button = $el("button.jupo-trigger-section-button", {
                textContent: word,
                onclick: () => this.insertWord(word)
            });
            this.buttons.append(button);
        });
    }

    // ------------------------------------------
    // トリガーワードがない場合のメッセージ表示
    // ------------------------------------------
    showEmptyMessage() {
        const empty = $el("div.jupo-trigger-section-empty", {
            textContent: "Civitaiにトリガーワードが登録されていません"
        });
        this.buttons.append(empty);
    }
}