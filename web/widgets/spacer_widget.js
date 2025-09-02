import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { $el } from "../../../scripts/ui.js";
import { mk_name, mk_endpoint, api_get, api_post, loadCSS } from "../utils.js";

import { CONSTANTS, Utils, Renderer } from "../ui.js";
import { BaseWidget } from "./base_widget.js";


// ==============================================
// スペーサーウィジェット
// ==============================================

export class PowerLoRASpacerWidget extends BaseWidget {
    constructor(name = "spacer", widgetOptions = {}) {
        super(name, "spacer");
        this.value = "";
        this.widgetOptions = {
            marginTop: 10,
            marginBottom: 10,
            ...widgetOptions
        };
    }
    
    draw(ctx, node, width, posY, h) {
        // スペーサーは何も描画しない
    }
    
    computeSize(width) {
        return [
            width,
            this.widgetOptions.marginTop + this.widgetOptions.marginBottom,
        ];
    }
}
