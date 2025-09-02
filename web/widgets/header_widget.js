import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { $el } from "../../../scripts/ui.js";
import { mk_name, mk_endpoint, api_get, api_post, loadCSS } from "../utils.js";

import { CONSTANTS, Utils, Renderer } from "../ui.js";
import { BaseWidget } from "./base_widget.js";

// ==============================================
// ヘッダーウィジェット
// ==============================================

export class PowerLoRAHeaderWidget extends BaseWidget {
    constructor(name = "lora_header") {
        super(name, "header");
        this.value = "";
        this.hitAreas = {
            toggle: { bounds: [0, 0], onClick: this.onToggleAllClick },
        };
    }

    draw(ctx, node, width, y, height) {
        if (Utils.isLowQuality() || node.loraWidgets.length === 0) return;

        const margin = CONSTANTS.MARGIN;
        const padding = CONSTANTS.PILL_PADDING;
        const pillHeight = CONSTANTS.PILL_HEIGHT;

        let currentX = margin + padding;

        // トグル状態を決定
        const allEnabled = node.loraWidgets.every(w => w.value.enabled);
        const allDisabled = node.loraWidgets.every(w => !w.value.enabled);
        const toggleState = allEnabled ? 'on' : (allDisabled ? 'off' : 'indeterminate');
        
        // トグルスイッチ描画
        const toggleWidth = Renderer.drawToggleSwitch(ctx, currentX, y, pillHeight, toggleState);
        this.hitAreas.toggle.bounds = [currentX, y, toggleWidth, pillHeight];
        currentX += toggleWidth + padding;

        // ラベル描画
        ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#a0aec0"; // Gray color for labels

        // "LoRA" ラベル
        ctx.fillText("LoRA", currentX + padding/2, y + pillHeight / 2);
        
        // "Strength" / "Model" / "Clip" ラベル (右寄せ)
        const strengthControlWidth = CONSTANTS.STRENGTH_WIDTH;
        const deleteButtonWidth = 20;
        let strengthLabelX = width - margin - padding - deleteButtonWidth - padding - strengthControlWidth;
        let strengthLabel = "Strength";
        
        if (node.clipSettingMode === 'individual') {
             strengthLabelX -= (strengthControlWidth + padding);
             ctx.textAlign = "center";
             ctx.fillText("Clip", strengthLabelX + strengthControlWidth * 1.5 + padding, y + pillHeight / 2);
             strengthLabel = "Model";
        }

        ctx.textAlign = "center";
        ctx.fillText(strengthLabel, strengthLabelX + strengthControlWidth / 2, y + pillHeight / 2);
    }

    onToggleAllClick(event, pos, node) {
        const allEnabled = node.loraWidgets.every(w => w.value.enabled);
        const newState = !allEnabled;
        node.loraWidgets.forEach(w => w.value.enabled = newState);
        node.setDirtyCanvas(true, true);
        this.cancelMouseDown();
        return true;
    }

    computeSize(width) {
        return [width, CONSTANTS.PILL_HEIGHT];
    }
}
