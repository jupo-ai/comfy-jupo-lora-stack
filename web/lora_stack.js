import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";
import { mk_name, mk_endpoint, api_get, api_post, loadCSS } from "./utils.js";

import { CONSTANTS, Utils, Renderer } from "./ui.js";
import { settings } from "./settings.js";
import { PowerLoRAHeaderWidget } from "./widgets/header_widget.js";
import { PowerLoRASpacerWidget } from "./widgets/spacer_widget.js";
import { PowerLoRAButtonWidget } from "./widgets/button_widget.js";
import { PowerLoRACompoundWidget } from "./widgets/lora_widget.js";


const classNames = [mk_name("LoRA_Stack_(jupo)"), mk_name("LoRA_Loader_(jupo)")];

// ==============================================
// コンテキストメニューパッチ
// ==============================================
let contextMenuPatched = false;

function applyContextMenuPatch() {
    if (contextMenuPatched) {
        return;
    }
    contextMenuPatched = true;

    const canvasPrototype = app.canvas.constructor.prototype;
    const orig_processContextMenu = canvasPrototype.processContextMenu;

    canvasPrototype.processContextMenu = function(node, e) {
        // LoRA Stackノードかどうかをチェック
        if (node && classNames.includes(node.constructor.comfyClass)) {
            const canvas_pos = this.convertEventToCanvasOffset(e);
            const node_pos = [canvas_pos[0] - node.pos[0], canvas_pos[1] - node.pos[1]];

            // LoRAウィジェット領域内をクリックしたかチェック
            const clickedWidget = node.getClickedLoRAWidget(node_pos[0], node_pos[1]);
            if (clickedWidget) {
                // カスタムコンテキストメニューを表示（ウィジェット側で処理）
                clickedWidget.showContextMenu(e, node);
                return; // オリジナルメニューを阻止
            }
        }

        // 条件に合わない場合は、オリジナルのコンテキストメニューを表示
        return orig_processContextMenu.apply(this, arguments);
    };
}


// ==============================================
// ノード拡張
// ==============================================
const extension = {
    name: mk_name("LoRAStack"),

    settings: settings.slice().reverse(), 

    init: async function(app) {
        // コンテキストメニューパッチを適用
        applyContextMenuPatch();
    },

    beforeRegisterNodeDef: async function(nodeType, nodeData, app) {
        if (!classNames.includes(nodeType.comfyClass)) return;

        const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
        const originalSerialize = nodeType.prototype.serialize;
        const originalConfigure = nodeType.prototype.configure;

        nodeType.prototype.onNodeCreated = function() {
            const result = originalOnNodeCreated?.apply(this, arguments);

            // lora_list入力を非表示にする
            const loraListWidget = this.widgets.find(w => w.name === "lora_list");
            if (loraListWidget) {
                loraListWidget.type = "hidden";
            }
            
            this.loraCounter = 0;
            this.loraWidgets = [];
            this.serialize_widgets = true;
            this.loraDisplayMode = 'filename'; // 'filename' または 'full'
            this.clipSettingMode = 'common'; // 'common' または 'individual'
            this.initializeUI();
            this.updateNodeSize();
            
            return result;
        };

        // lora_listの値を隠しフィールドのセット
        nodeType.prototype.updateLoraListValue = function() {
            const loraListWidget = this.widgets.find(w => w.name === "lora_list");
            if (loraListWidget) {
                const loraList = this.loraWidgets.map(widget => widget.value);
                loraListWidget.value = JSON.stringify(loraList);
            }
        };

        nodeType.prototype.serialize = function() {
            const data = originalSerialize?.apply(this, arguments) || {};
            
            // LoRAデータを保存
            data.lora_list = this.widgets
                .filter(widget => widget instanceof PowerLoRACompoundWidget)
                .map(widget => widget.value);
            
            // 表示モードとClip設定モードも保存
            data.lora_display_mode = this.loraDisplayMode;
            data.clip_setting_mode = this.clipSettingMode;
            
            return data;
        };

        nodeType.prototype.configure = function(data) {
            const result = originalConfigure?.apply(this, arguments);
            
            this.clearAllWidgets();
            
            this.loraDisplayMode = data.lora_display_mode || 'filename';
            this.clipSettingMode = data.clip_setting_mode || 'common';
            
            this.initializeUI();
            
            if (data.lora_list && Array.isArray(data.lora_list)) {
                data.lora_list.forEach(widgetData => {
                    const widget = this.addLoRAWidget(widgetData.lora); 
                    widget.value = widgetData; // 保存されていた値で上書き
                });
            }
            
            this.updateLoraListValue();
            this.updateNodeSize();
            return result;
        };

        nodeType.prototype.initializeUI = function() {
            // スペーサー
            this.addCustomWidget(new PowerLoRASpacerWidget("spacerTop", { marginTop: 0, marginBottom: 0 }));
            
            // ヘッダーウィジェット
            this.addCustomWidget(new PowerLoRAHeaderWidget("lora_header"));
            
            // スペーサー
            this.addCustomWidget(new PowerLoRASpacerWidget("spacerBottom", { marginTop: 4, marginBottom: 4 }));

            // 追加ボタン
            const addButton = new PowerLoRAButtonWidget(
                "add_lora_button",
                "➕ LoRAを追加",
                (event, pos, node) => {
                    Utils.showLoRAChooser(event, "None", (selectedLora) => {
                        this.addLoRAWidget(selectedLora);
                    });
                    return true;
                }
            );
            this.addCustomWidget(addButton);
        };

        nodeType.prototype.addLoRAWidget = function(selectedLora = "None") {
            this.loraCounter++;

            const loraWidget = new PowerLoRACompoundWidget(`lora_${this.loraCounter}`, {
                enabled: true,
                lora: selectedLora,
                strength_model: 1.0,
                strength_clip: 1.0,
                clip_mode: this.clipSettingMode === 'individual',
                deleteCallback: (widget) => this.removeLoRAWidget(widget), 
                valueChangedCallback: () => this.updateLoraListValue(), 
            });

            this.loraWidgets.push(loraWidget);

            // spacerBottomの前にウィジェットを挿入
            const spacerIndex = this.widgets.findIndex(w => w.name === "spacerBottom");
            this.widgets.splice(spacerIndex, 0, loraWidget);

            this.updateLoraListValue();
            this.updateNodeSize();
            return loraWidget;
        };

        nodeType.prototype.removeLoRAWidget = function(widget) {
            const index = this.loraWidgets.indexOf(widget);
            if (index !== -1) {
                this.loraWidgets.splice(index, 1);
                const widgetIndex = this.widgets.indexOf(widget);
                if (widgetIndex !== -1) {
                    this.widgets.splice(widgetIndex, 1);
                }
                this.updateLoraListValue();
                this.updateNodeSize();
            }
        };

        nodeType.prototype.clearAllWidgets = function() {
            this.widgets = this.widgets.filter(w => w.name === "lora_list");
            this.loraWidgets = [];
        };

        nodeType.prototype.updateNodeSize = function() {
            const computed = this.computeSize();
            this.size[0] = Math.max(this.size[0], computed[0]);
            this.size[1] = Math.max(this.size[1], computed[1]);
            this.setDirtyCanvas(true, true);
        };

        // ===== コンテキストメニュー関連メソッド =====
        nodeType.prototype.getClickedLoRAWidget = function(x, y) {
            for (const widget of this.widgets) {
                if (widget instanceof PowerLoRACompoundWidget) {
                    // ウィジェット側のメソッドを使用してクリック判定（nodeを引数で渡す）
                    if (widget.isClickedAt(x, y, this)) {
                        return widget;
                    }
                }
            }
            return null;
        };
    }
};

app.registerExtension(extension);