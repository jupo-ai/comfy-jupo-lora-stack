import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { $el } from "../../../scripts/ui.js";
import { mk_name, mk_endpoint, api_get, api_post, loadCSS } from "../utils.js";

import { CONSTANTS, Utils, Renderer } from "../ui.js";
import { BaseWidget } from "./base_widget.js";


// ==============================================
// 追加ボタンウィジェット
// ==============================================

export class PowerLoRAButtonWidget extends BaseWidget {
    constructor(name, label, clickCallback) {
        super(name, "addButton");
        this.value = "";
        this.label = label || name;
        this.clickCallback = clickCallback;
    }
    
    draw(ctx, node, width, y, height) {
        if (Utils.isLowQuality()) return;
        
        const margin = CONSTANTS.MARGIN;
        const buttonWidth = width - margin * 2;
        const buttonHeight = CONSTANTS.BUTTON_HEIGHT;
        
        ctx.save();
        
        // ボタン背景
        ctx.beginPath();
        ctx.roundRect(margin, y + (this.isMouseDownedAndOver ? 1 : 0), buttonWidth, buttonHeight, CONSTANTS.BORDER_RADIUS);
        ctx.fillStyle = this.isMouseDownedAndOver ? "#38a169" : "#48bb78";
        ctx.fill();
        
        ctx.strokeStyle = "#2f855a";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // ボタンテキスト
        ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(this.label, margin + buttonWidth / 2, y + buttonHeight / 2 + (this.isMouseDownedAndOver ? 1 : 0));
        
        ctx.restore();
    }
    
    onMouseClick(event, pos, node) {
        return this.clickCallback?.(event, pos, node) || false;
    }
    
    computeSize(width) {
        return [width, CONSTANTS.BUTTON_HEIGHT];
    }
}
