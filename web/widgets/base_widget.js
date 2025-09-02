import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import { $el } from "../../../scripts/ui.js";
import { mk_name, mk_endpoint, api_get, api_post, loadCSS } from "../utils.js";

import { CONSTANTS, Utils, Renderer } from "../ui.js";

// ==============================================
// カスタムウィジェットの基底クラス
// ==============================================

export class BaseWidget {
    constructor(name, type = "custom") {
        this.type = type;
        this.name = name;
        this.y = 0;
        this.last_y = 0;
        this.mouseDowned = null;
        this.isMouseDownedAndOver = false;
        this.hitAreas = {};
        this.downedHitAreasForMove = [];
        this.downedHitAreasForClick = [];
    }
    
    clickWasWithinBounds(pos, bounds) {
        const xStart = bounds[0];
        const xEnd = xStart + (bounds.length > 2 ? bounds[2] : bounds[1]);
        const clickedX = pos[0] >= xStart && pos[0] <= xEnd;
        if (bounds.length === 2) return clickedX;
        return clickedX && pos[1] >= bounds[1] && pos[1] <= bounds[1] + bounds[3];
    }
    
    mouse(event, pos, node) {
        if (event.type === "pointerdown") {
            return this.handlePointerDown(event, pos, node);
        } else if (event.type === "pointerup") {
            return this.handlePointerUp(event, pos, node);
        } else if (event.type === "pointermove") {
            return this.handlePointerMove(event, pos, node);
        }
        return false;
    }

    handlePointerDown(event, pos, node) {
        this.mouseDowned = [...pos];
        this.isMouseDownedAndOver = true;
        this.downedHitAreasForMove.length = 0;
        this.downedHitAreasForClick.length = 0;
        let anyHandled = false;
        
        for (const part of Object.values(this.hitAreas)) {
            if (this.clickWasWithinBounds(pos, part.bounds)) {
                if (part.onMove) this.downedHitAreasForMove.push(part);
                if (part.onClick) this.downedHitAreasForClick.push(part);
                if (part.onDown) {
                    const thisHandled = part.onDown.apply(this, [event, pos, node, part]);
                    anyHandled = anyHandled || thisHandled === true;
                }
                part.wasMouseClickedAndIsOver = true;
            }
        }
        return this.onMouseDown?.(event, pos, node) ?? anyHandled;
    }

    handlePointerUp(event, pos, node) {
        if (!this.mouseDowned) return true;
        this.downedHitAreasForMove.length = 0;
        const wasMouseDownedAndOver = this.isMouseDownedAndOver;
        this.cancelMouseDown();
        let anyHandled = false;
        
        for (const part of Object.values(this.hitAreas)) {
            if (part.onUp && this.clickWasWithinBounds(pos, part.bounds)) {
                const thisHandled = part.onUp.apply(this, [event, pos, node, part]);
                anyHandled = anyHandled || thisHandled === true;
            }
            part.wasMouseClickedAndIsOver = false;
        }
        
        for (const part of this.downedHitAreasForClick) {
            if (this.clickWasWithinBounds(pos, part.bounds)) {
                const thisHandled = part.onClick.apply(this, [event, pos, node, part]);
                anyHandled = anyHandled || thisHandled === true;
            }
        }
        this.downedHitAreasForClick.length = 0;
        
        if (wasMouseDownedAndOver) {
            const thisHandled = this.onMouseClick?.(event, pos, node);
            anyHandled = anyHandled || thisHandled === true;
        }
        return this.onMouseUp?.(event, pos, node) ?? anyHandled;
    }

    handlePointerMove(event, pos, node) {
        this.isMouseDownedAndOver = !!this.mouseDowned;
        if (this.mouseDowned &&
            (pos[0] < 15 || pos[0] > node.size[0] - 15 ||
             pos[1] < this.last_y || pos[1] > this.last_y + CONSTANTS.PILL_HEIGHT)) {
            this.isMouseDownedAndOver = false;
        }
        
        for (const part of Object.values(this.hitAreas)) {
            if (this.downedHitAreasForMove.includes(part)) {
                part.onMove.apply(this, [event, pos, node, part]);
            }
            if (this.downedHitAreasForClick.includes(part)) {
                part.wasMouseClickedAndIsOver = this.clickWasWithinBounds(pos, part.bounds);
            }
        }
        return this.onMouseMove?.(event, pos, node) ?? true;
    }
    
    cancelMouseDown() {
        this.mouseDowned = null;
        this.isMouseDownedAndOver = false;
        this.downedHitAreasForMove.length = 0;
    }
    
    onMouseDown(event, pos, node) { return; }
    onMouseUp(event, pos, node) { return; }
    onMouseClick(event, pos, node) { return; }
    onMouseMove(event, pos, node) { return; }
}
