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

        // スケジュールスライダーの状態とDOM要素を保持するオブジェクト
        this.scheduleSlider = {
            _startValue: 0,
            _endValue: 1,
            elements: {
                track: null,
                fill: null,
                startThumb: null,
                endThumb: null,
                startInput: null,
                endInput: null,
            },
            isDragging: false,
            draggingThumb: null, // 'start' or 'end'
        };

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
        this.createScheduleSlider(); // ここでスケジュールスライダーを作成
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
        const path = `block.${blockType}.${key}`;
        const currentValue = this.getWidgetValue(path, options.value);

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

        this.bindSliderEvents(slider, numberInput, path, options);

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

    bindSliderEvents(slider, numberInput, path, options) {
        slider.addEventListener("input", () => {
            numberInput.value = slider.value;
            this.setWidgetValue(path, parseFloat(slider.value));
            // this.saveWidgetState(); // inputイベントで頻繁に保存するとパフォーマンスに影響するため、changeイベントで保存
        });
        slider.addEventListener("change", () => this.saveWidgetState());

        numberInput.addEventListener("input", () => {
            const value = Math.min(Math.max(numberInput.value, options.min), options.max);
            numberInput.value = value;
            slider.value = value;
            this.setWidgetValue(path, parseFloat(value));
            // this.saveWidgetState();
        });
        numberInput.addEventListener("change", () => this.saveWidgetState());
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

    createScheduleSlider() {
        const sliderContainer = $el("div.jupo-block-dialog-dual-slider-container");
        const track = $el("div.jupo-block-dialog-dual-slider-track");
        const fill = $el("div.jupo-block-dialog-dual-slider-fill");
        // 修正済: 複数のクラスはドットで連結する
        const startThumb = $el("div.jupo-block-dialog-dual-slider-thumb.jupo-block-dialog-dual-slider-thumb-start");
        const endThumb = $el("div.jupo-block-dialog-dual-slider-thumb.jupo-block-dialog-dual-slider-thumb-end");
        
        track.append(fill, startThumb, endThumb);

        const numberInputWrapper = $el("div.jupo-block-dialog-dual-slider-number-inputs");
        const startInput = $el("input.jupo-block-dialog-number-input", {
            type: "number",
            min: 0,
            max: 1,
            step: 0.01,
            value: 0
        });
        const endInput = $el("input.jupo-block-dialog-number-input", {
            type: "number",
            min: 0,
            max: 1,
            step: 0.01,
            value: 1
        });
        numberInputWrapper.append(startInput, endInput);

        sliderContainer.append(track, numberInputWrapper);

        // DOM要素の参照を保存
        this.scheduleSlider.elements = {
            track: track,
            fill: fill,
            startThumb: startThumb,
            endThumb: endThumb,
            startInput: startInput,
            endInput: endInput,
        };

        // イベントリスナーの追加
        startThumb.addEventListener("mousedown", (e) => this._onScheduleThumbMouseDown(e, 'start'));
        endThumb.addEventListener("mousedown", (e) => this._onScheduleThumbMouseDown(e, 'end'));
        
        startInput.addEventListener("input", (e) => this._onScheduleNumberInput(e, 'start'));
        startInput.addEventListener("change", () => this.saveWidgetState());

        endInput.addEventListener("input", (e) => this._onScheduleNumberInput(e, 'end'));
        endInput.addEventListener("change", () => this.saveWidgetState());

        this.createRightItem("スケジュール", sliderContainer);
    }

    // スケジュールスライダーのUIを更新
    _updateScheduleSliderUI() {
        const { track, fill, startThumb, endThumb, startInput, endInput } = this.scheduleSlider.elements;
        const { _startValue, _endValue } = this.scheduleSlider;

        if (!track) return; // UIがまだ初期化されていない場合は何もしない

        const trackWidth = track.offsetWidth; 
        // trackWidthが0の場合、つまみは0の位置に重なるため、ここでガードするか、
        // 呼び出しをDOMが完全にレイアウトされた後に遅延させる必要があります。
        if (trackWidth === 0) {
            // trackWidthが0の場合は処理を中断し、次のrequestAnimationFrameで再度試行させる
            // あるいは、呼び出し元でrequestAnimationFrameを使用する
            return; 
        }

        // つまみの幅を考慮して正確な位置を計算する場合もあるが、シンプルに0-1の割合で計算
        const startPos = _startValue * trackWidth;
        const endPos = _endValue * trackWidth;

        startThumb.style.left = `${startPos}px`;
        endThumb.style.left = `${endPos}px`;
        
        fill.style.left = `${startPos}px`;
        fill.style.width = `${endPos - startPos}px`;

        startInput.value = _startValue.toFixed(2);
        endInput.value = _endValue.toFixed(2);
    }

    // つまみのドラッグ開始
    _onScheduleThumbMouseDown(e, thumbType) {
        e.preventDefault(); // デフォルトのドラッグ動作を防止
        this.scheduleSlider.isDragging = true;
        this.scheduleSlider.draggingThumb = thumbType;

        // イベントリスナーをwindowに登録して、つまみがtrack外に出てもドラッグを継続できるようにする
        window.addEventListener("mousemove", this._onScheduleThumbMouseMove);
        window.addEventListener("mouseup", this._onScheduleThumbMouseUp);
    }

    // つまみのドラッグ中
    _onScheduleThumbMouseMove = (e) => {
        if (!this.scheduleSlider.isDragging) return;

        const { track } = this.scheduleSlider.elements;
        const { draggingThumb, _startValue, _endValue } = this.scheduleSlider;

        const trackRect = track.getBoundingClientRect();
        const mouseX = e.clientX;
        
        // トラック内でのマウスの相対位置 (0から1の範囲)
        let newValue = (mouseX - trackRect.left) / trackRect.width;
        newValue = Math.max(0, Math.min(1, newValue)); // 0から1の範囲にクランプ
        newValue = parseFloat(newValue.toFixed(2)); // step 0.01に合わせる

        if (draggingThumb === 'start') {
            this.scheduleSlider._startValue = Math.min(newValue, _endValue);
        } else { // draggingThumb === 'end'
            this.scheduleSlider._endValue = Math.max(newValue, _startValue);
        }
        
        this._updateScheduleSliderUI();
    }

    // つまみのドラッグ終了
    _onScheduleThumbMouseUp = () => {
        this.scheduleSlider.isDragging = false;
        this.scheduleSlider.draggingThumb = null;

        window.removeEventListener("mousemove", this._onScheduleThumbMouseMove);
        window.removeEventListener("mouseup", this._onScheduleThumbMouseUp);
        
        this.saveWidgetState(); // ドラッグ終了時に状態を保存
    }

    // 数値入力フィールドの更新
    _onScheduleNumberInput(e, inputType) {
        let value = parseFloat(e.target.value);
        const { _startValue, _endValue } = this.scheduleSlider;

        if (isNaN(value)) {
            // 不正な入力の場合、以前の値に戻すかデフォルト値にする
            value = (inputType === 'start') ? _startValue : _endValue;
        }

        // 0から1の範囲にクランプ
        value = Math.max(0, Math.min(1, value));
        value = parseFloat(value.toFixed(2)); // step 0.01に合わせる

        if (inputType === 'start') {
            this.scheduleSlider._startValue = Math.min(value, _endValue);
        } else { // inputType === 'end'
            this.scheduleSlider._endValue = Math.max(value, _startValue);
        }

        this._updateScheduleSliderUI();
        // saveWidgetStateはchangeイベントで呼ばれる
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
        // スケジュールスライダーのイベントはcreateScheduleSlider内でバインドされている
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

        const newState = {
            ...this.widget.value, // 既存のwidget値を保持
            enabled_block: this.switchInput.checked,
            model_type: this.modelTypeDropdown.value,
            block: this.getBlockInfo(),
        };

        // スケジュールスライダーの値を保存
        newState.start = this.scheduleSlider._startValue;
        newState.end = this.scheduleSlider._endValue;
        
        this.widget.value = newState;
    }

    loadWidgetState() {
        if (!this.widget) return;

        this.switchInput.checked = this.getWidgetValue("enabled_block", false);
        this.modelTypeDropdown.value = this.getWidgetValue("model_type", "SD");
        
        // スケジュールスライダーの値をロード
        this.scheduleSlider._startValue = this.getWidgetValue("start", 0);
        this.scheduleSlider._endValue = this.getWidgetValue("end", 1);
        
        this.updateUIState();
    }

    // ------------------------------------------
    // UI状態管理
    // ------------------------------------------
    updateUIState() {
        this.updateOverlayState();
        this.updateSliderState();
        // スケジュールスライダーのUI更新を次のアニメーションフレームに遅延させる
        // これにより、DOM要素が完全にレイアウトされ、offsetWidthが正確になることを保証します。
        requestAnimationFrame(() => {
            this._updateScheduleSliderUI();
        });
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
        // this.modelPathがnullの場合を考慮
        if (!this.modelPath) return "unknown";
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