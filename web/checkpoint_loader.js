import { app } from "../../scripts/app.js";
import { mk_name } from "./utils.js";
import { applyContextMenuPatch } from "./context_menu_patch.js";
import { customize } from "./widgets/ckpt_widget.js";


const classNames = [mk_name("Checkpoint_Loader_(jupo)")];

// ==============================================
// ノード拡張
// ==============================================
const extension = {
    name: mk_name("CheckpointLoader"), 
    init: async function(app) {
        applyContextMenuPatch(classNames);
    }, 

    beforeRegisterNodeDef: async function (nodeType, nodeData, app) {
        if (!classNames.includes(nodeType.comfyClass)) return;

        // --- on Node Created -----------------------
        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = origOnNodeCreated?.apply(this, arguments);
            
            const ckptWidget = this.widgets.find(w => w.name === "ckpt_name");
            this.customizeCkptWidget(ckptWidget);

            return result;
        };


        // --- ckptWidgetをカスタマイズ ----------------
        nodeType.prototype.customizeCkptWidget = function(ckptWidget) {
            customize(ckptWidget);
        };


        // --- コンテキストメニュー関連メソッド -----------------
        nodeType.prototype.getClickedWidget = function(x, y) {
            // ckptWigetをクリックしたか判定
            const ckptWidget = this.widgets.find(w => w.name === "ckpt_name");
            if (ckptWidget) {
                if (ckptWidget.isClickedAt(x, y, this)) {
                    return ckptWidget;
                }
            }
            return null;
        }
    }
};

app.registerExtension(extension);