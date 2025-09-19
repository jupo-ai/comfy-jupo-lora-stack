import { app } from "../../scripts/app.js";
import { mk_name } from "./utils.js";
import { applyContextMenuPatch } from "./context_menu_patch.js";

import { Utils } from "./ui.js"
import { PowerLoRASpacerWidget } from "./widgets/spacer_widget.js";
import { PowerLoRAButtonWidget } from "./widgets/button_widget.js";
import { PowerCheckpointCompoundWidget } from "./widgets/ckpt_widget.js";

const classNames = [mk_name("Checkpoint_Selector_(jupo)")];

// ==============================================
// ノード拡張
// ==============================================
const extension = {
    name: mk_name("CheckpointSelector"), 

    init: async function(app) {
        applyContextMenuPatch(classNames);
    }, 

    beforeRegisterNodeDef: async function(nodeType, nodeData, app) {
        if (!classNames.includes(nodeType.comfyClass)) return;

        // --------------------------------------
        // onNodeCreated
        // --------------------------------------
        const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = originalOnNodeCreated?.apply(this, arguments);

            // checkpoint入力を非表示にする
            const checkpointWidget = this.widgets.find(w => w.name === "checkpoint");
            if (checkpointWidget) {
                checkpointWidget.type = "hidden";
                checkpointWidget.hidden = true;
                checkpointWidget.disabled = true;
            }

            this.counter = 0;
            this.serialize_widgets = true;
            this.displayMode = "filename" // filename or full
            this.initializeUI();
            this.updateNodeSize();

            return result;
        };


        // --------------------------------------
        // initializeUI
        // --------------------------------------
        nodeType.prototype.initializeUI = function() {
            // スペーサー
            this.addCustomWidget(new PowerLoRASpacerWidget("spacerTop", { marginTop: 0, marginBottom: 0}));

            // ヘッダー
            // checkpointにはヘッダーは必要ない

            // スペーサー
            this.addCustomWidget(new PowerLoRASpacerWidget("spacerBottom", { maringTop: 4, marginBottom: 4}));

            // 追加ボタン
            const addButton = new PowerLoRAButtonWidget(
                "add_checkpoint_botton", 
                "➕ Checkpointを追加", 
                (event, pos, node) => {
                    Utils.showCheckpointChooser(event, "None", (selected) => {
                        this.disableAllWidgets();
                        this.addCheckpointWidget(selected);
                    });
                    return true
                }
            );
            this.addCustomWidget(addButton);
        };


        // --------------------------------------
        // addCheckpointWidget
        // --------------------------------------
        nodeType.prototype.addCheckpointWidget = function(selected = "None") {
            this.counter++;

            const checkpointWidget = new PowerCheckpointCompoundWidget(`checkpoint_${this.counter}`, {
                enabled: true, 
                path: selected, 
                deleteCallback: (widget) => this.removeCheckpointWidget(widget), 
                valueChangedCallback: () => this.updateCheckpointValue(), 
            });

            // spacerBottomの前にウィジェットを挿入
            const spacerIndex = this.widgets.findIndex(w => w.name === "spacerBottom");
            this.widgets.splice(spacerIndex, 0, checkpointWidget);

            this.updateCheckpointValue();
            this.updateNodeSize();
            return checkpointWidget;
        };


        // --------------------------------------
        // removeCheckpointWidget
        // --------------------------------------
        nodeType.prototype.removeCheckpointWidget = function(widget) {
            const index = this.widgets.indexOf(widget);
            if (index !== -1) {
                this.widgets.splice(index, 1);
            }
            this.updateCheckpointValue();
            this.updateNodeSize();
        };


        // --------------------------------------
        // clearAllWidgets
        // --------------------------------------
        nodeType.prototype.clearAllWidgets = function() {
            this.widgets = this.widgets.filter(w => w.name === "checkpoint");
        };


        // --------------------------------------
        // updateCheckpointValue
        // --------------------------------------
        nodeType.prototype.updateCheckpointValue = function() {
            const checkpointWidget = this.widgets.find(w => w.name === "checkpoint");
            if (checkpointWidget) {
                const enabledWidget = this.widgets
                    .filter(w => w instanceof PowerCheckpointCompoundWidget)
                    .find(w => w.value.enabled);
                const value = enabledWidget?.value ?? {}
                checkpointWidget.value = JSON.stringify(value);
            }
        };


        // --------------------------------------
        // updateNodeSize
        // --------------------------------------
        nodeType.prototype.updateNodeSize = function() {
            const computed = this.computeSize();
            this.size[0] = Math.max(this.size[0], computed[0]);
            this.size[1] = Math.max(this.size[1], computed[1]);
            this.setDirtyCanvas(true);
        };


        // --------------------------------------
        // disableAllWidgets
        // --------------------------------------
        nodeType.prototype.disableAllWidgets = function() {
            this.widgets.forEach(w => {
                if (w instanceof PowerCheckpointCompoundWidget) w.value.enabled = false;
            })
        };


        // --------------------------------------
        // serialize
        // --------------------------------------
        const originalSerialize = nodeType.prototype.serialize;
        nodeType.prototype.serialize = function() {
            const data = originalSerialize?.apply(this, arguments) || {};

            // ウィジェットの値を保存
            data.widgetValues = this.widgets
                .filter(w => w instanceof PowerCheckpointCompoundWidget)
                .map(w => w.value);
            
            // 表示モードを保存
            data.displayMode = this.displayMode;

            return data;
        };


        // --------------------------------------
        // configure
        // --------------------------------------
        const originalConfigure = nodeType.prototype.configure;
        nodeType.prototype.configure = function(data) {
            const result = originalConfigure?.apply(this, arguments);

            this.clearAllWidgets();
            this.displayMode = data.displayMode || "filename";
            this.initializeUI();

            //  widgetValuesからウィジェットを復元
            if (data.widgetValues && Array.isArray(data.widgetValues)) {
                data.widgetValues.forEach(value => {
                    const widget = this.addCheckpointWidget(value.path);
                    widget.value = value;
                });
            }

            this.updateCheckpointValue();
            this.updateNodeSize();
            return result;
        };


        // --------------------------------------
        // コンテキストメニュー関連メソッド
        // getClickedWidget
        // --------------------------------------
        nodeType.prototype.getClickedWidget = function(x, y) {
            for (const widget of this.widgets){
                if (widget instanceof PowerCheckpointCompoundWidget) {
                    // ウィジェット側のメソッドを使用してクリック判定
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