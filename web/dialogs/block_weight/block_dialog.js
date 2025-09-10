import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";

import { BaseDialog } from "../base/base_dialog.js";
import { BlockConfigs } from "./block_configs.js";
import { applyBIMO } from "./bimo_syntax.js";

loadCSS("dialogs/block_weight/css/block_dialog.css");

// ==============================================
// ブロックウェイト設定ダイアログ
// ==============================================
export class BlockWeightDialog extends BaseDialog {
    constructor(widget) {
        super();
        this.widget = widget;
        this.sliders = [];
        this.modelPath = null;

        this.initializeUI();
        this.bindAllEvents();
    }

    // ------------------------------------------
    // 初期化
    // ------------------------------------------
    initializeUI() {
        this.container.classList.add("jupo-block-dialog-container");
        this.createHeader();
        this.createContentArea();
    }

    createHeader() {
        this.headerTitle = $el("div.jupo-block-dialog-header-title");
        const header = $el("div.jupo-block-dialog-header", [this.headerTitle]);
        this.headerTitle.textContent = "ヘッダー";
        this.container.append(header);
    }

    createContentArea() {
        this.contentArea = $el("div.jupo-block-dialog-content-area");
        this.createBlockSection();
        this.createRightSection();
        this.container.append(this.contentArea);
    }

    createBlockSection() {
        this.blockSection = $el("div.jupo-block-dialog-block-section");
        this.blockSectionOverlay = $el("div.jupo-block-dialog-block-section-overlay", {
            textContent: "無効中です"
        });
        this.sliderContainer = $el("div.jupo-block-dialog-sliders");
        this.blockSection.append(this.blockSectionOverlay, this.sliderContainer);
        this.contentArea.append(this.blockSection);
    }

    createRightSection() {
        this.rightSection = $el("div.jupo-block-dialog-right-section");
        this.createEnableSwitch();
        this.createModelTypeSelector();
        this.createBimoSyntaxInput();
        this.contentArea.append(this.rightSection);
    }

    // ------------------------------------------
    // スライダー管理
    // ------------------------------------------
    createSliders() {
        const config = this.getCurrentBlockConfig();
        if (!config) return;

        this.clearSliders();
        const options = { min: 0, max: 1, step: 0.01, value: 1 };

        ['upper', 'left', 'right', 'bottom'].forEach(position => {
            if (config[position]) {
                const container = $el(`div.jupo-block-dialog-sliders-${position}`);
                config[position].forEach(info => {
                    const slider = this.createSlider(info[0], info[1], info[2], options);
                    container.append(slider.element);
                    this.sliders.push(slider);
                });
                this.sliderContainer.append(container);
            }
        });
    }

    createSlider(key, label, blockType, options) {
        const currentValue = this.getWidgetValue(`block.${blockType}.${key}`, options.value);

        const slider = $el("input.jupo-block-dialog-slider-input", {
            type: "range",
            min: options.min,
            max: options.max,
            step: options.step,
            value: currentValue,
        });

        const numberInput = $el("input.jupo-block-dialog-number-input", {
            type: "number",
            min: options.min,
            max: options.max,
            step: options.step,
            value: currentValue,
        });

        const labelEl = $el("label.jupo-block-dialog-slider-label", {
            textContent: label
        });

        const inputContainer = $el("div.jupo-block-dialog-slider-container", [slider, numberInput]);
        const container = $el("div.jupo-block-dialog-slider-wrapper", [labelEl, inputContainer]);

        this.bindSliderEvents(slider, numberInput, options);

        return {
            element: container,
            getValue: () => parseFloat(slider.value),
            setValue: (value) => {
                slider.value = value;
                numberInput.value = value;
            },
            blockType: blockType,
            key: key
        };
    }

    bindSliderEvents(slider, numberInput, options) {
        slider.addEventListener("input", () => {
            numberInput.value = slider.value;
            this.saveWidgetState();
        });

        numberInput.addEventListener("input", () => {
            const value = Math.min(Math.max(numberInput.value, options.min), options.max);
            numberInput.value = value;
            slider.value = value;
            this.saveWidgetState();
        });
    }

    clearSliders() {
        this.sliders = [];
        this.sliderContainer.replaceChildren();
    }

    // ------------------------------------------
    // 右側コントロール
    // ------------------------------------------
    createRightItem(label, element) {
        const item = $el("div.jupo-block-dialog-right-item");
        const labelEl = $el("div.jupo-block-dialog-right-item-label", {
            textContent: label
        });
        const container = $el("div.jupo-block-dialog-right-element", [element]);

        item.append(labelEl, container);
        this.rightSection.append(item);
    }

    createEnableSwitch() {
        this.switchInput = $el("input.jupo-block-dialog-enable-input", { type: "checkbox" });
        const switchElement = $el("label.jupo-block-dialog-enable-switch", [
            this.switchInput,
            $el("span.jupo-block-dialog-enable-slider")
        ]);

        this.createRightItem("有効化", switchElement);
    }

    createModelTypeSelector() {
        this.modelTypeDropdown = $el("select.jupo-block-dialog-modelType-dropdown");
        
        Object.keys(BlockConfigs).forEach(key => {
            const option = $el("option", {
                value: key,
                textContent: key
            });
            this.modelTypeDropdown.append(option);
        });

        this.createRightItem("モデルタイプ", this.modelTypeDropdown);
    }

    createBimoSyntaxInput() {
        this.bimoInput = $el("input.jupo-block-dialog-bimo-input", {
            type: "text"
        });
        
        this.bimoApplyButton = $el("button.jupo-block-dialog-bimo-button", {
            textContent: "適用"
        });
        
        const inputContainer = $el("div.jupo-block-dialog-bimo-container", [
            this.bimoInput,
            this.bimoApplyButton
        ]);
        
        this.createRightItem("BIMO構文", inputContainer);
    }

    // ------------------------------------------
    // イベントハンドリング
    // ------------------------------------------
    bindAllEvents() {
        this.switchInput.addEventListener("change", () => this.handleSwitchChange());
        this.modelTypeDropdown.addEventListener("change", () => this.handleModelTypeChange());
        this.bimoApplyButton.addEventListener("click", () => this.handleBimoApply());
        this.bimoInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                this.handleBimoApply();
            }
        });
    }

    handleSwitchChange() {
        this.saveWidgetState();
        this.updateOverlayState();
    }

    handleModelTypeChange() {
        this.saveWidgetState();
        this.updateSliderState();
    }

    handleBimoApply() {
        applyBIMO(this.bimoInput.value, this.sliders, this.getCurrentBlockConfig());
        this.saveWidgetState();
    }

    // ------------------------------------------
    // Widget値の管理
    // ------------------------------------------
    getWidgetValue(path, defaultValue = undefined) {
        if (!this.widget) return defaultValue;
        
        const keys = path.split('.');
        let current = this.widget.value;
        
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            
            // 空文字の場合はスキップ（連続するドットの処理）
            if (key === '') continue;
            
            if (current && typeof current === 'object') {
                // 現在のキーで直接アクセスを試す
                if (key in current) {
                    current = current[key];
                } else {
                    // 残りのキーを結合して一つのキーとして試す
                    const remainingPath = keys.slice(i).join('.');
                    if (remainingPath in current) {
                        return (current[remainingPath] === null || current[remainingPath] === undefined) 
                            ? defaultValue : current[remainingPath];
                    } else {
                        return defaultValue;
                    }
                }
            } else {
                return defaultValue;
            }
        }
        
        return (current === null || current === undefined) ? defaultValue : current;
    }

    setWidgetValue(path, value) {
        if (!this.widget) return;
        
        const keys = path.split('.');
        let current = this.widget.value;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    saveWidgetState() {
        if (!this.widget) return;

        this.widget.value = {
            ...this.widget.value,
            enabled_block: this.switchInput.checked,
            model_type: this.modelTypeDropdown.value,
            block: this.getBlockInfo(),
        };
    }

    loadWidgetState() {
        if (!this.widget) return;

        this.switchInput.checked = this.getWidgetValue("enabled_block", false);
        this.modelTypeDropdown.value = this.getWidgetValue("model_type", "SD");
        
        this.updateUIState();
    }

    // ------------------------------------------
    // UI状態管理
    // ------------------------------------------
    updateUIState() {
        this.updateOverlayState();
        this.updateSliderState();
    }

    updateOverlayState() {
        const isEnabled = this.switchInput.checked;
        this.blockSectionOverlay.style.display = isEnabled ? "none" : "flex";
    }

    updateSliderState() {
        this.createSliders();
    }

    // ------------------------------------------
    // ユーティリティ
    // ------------------------------------------
    getCurrentBlockConfig() {
        const type = this.getWidgetValue("model_type", "SD");
        return BlockConfigs[type];
    }

    getBlockInfo() {
        const blockInfo = {};
        
        this.sliders.forEach(slider => {
            const { blockType, key } = slider;
            const value = slider.getValue();

            if (!blockInfo[blockType]) {
                blockInfo[blockType] = {};
            }
            blockInfo[blockType][key] = value;
        });

        return blockInfo;
    }

    getFileName() {
        const lastSlash = Math.max(this.modelPath.lastIndexOf('/'), this.modelPath.lastIndexOf('\\'));
        let fileName = lastSlash !== -1 ? this.modelPath.substring(lastSlash + 1) : this.modelPath;
        const dotIndex = fileName.lastIndexOf('.');
        return dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
    }

    // ------------------------------------------
    // パブリックメソッド
    // ------------------------------------------
    show() {
        this.headerTitle.textContent = this.getFileName();
        this.loadWidgetState();
        super.show();
    }

    close() {
        this.saveWidgetState(); // どっかのハンドラーでsaveの呼び出し順がバグってるのでここで確実に保存
        super.close();
    }
}