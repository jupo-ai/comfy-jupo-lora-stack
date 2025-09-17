import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";
import { mk_name, mk_endpoint, api_get, api_post, loadCSS } from "./utils.js";

import { LoRAExplorer } from "./dialogs/lora_explorer.js";
import { CheckpointExplorer } from "./dialogs/checkpoint_exproloer.js";

// === 定数定義 ===
export const CONSTANTS = {
    WIDGET_HEIGHT: LiteGraph.NODE_WIDGET_HEIGHT || 20,
    MARGIN: 10,
    INNER_MARGIN: 8,
    PILL_HEIGHT: 24,
    PILL_SPACING: 8,
    PILL_PADDING: 8,
    BORDER_RADIUS: 8,
    TOGGLE_RADIUS: 6,
    BUTTON_HEIGHT: 28,
    STRENGTH_WIDTH: 70,
    MIN_PILL_WIDTH: 200,
    STEP_SIZE: 0.05,
    DRAG_SENSITIVITY: 0.05
};


// === ユーティリティ関数 ===
export const Utils = {
    isLowQuality: () => ((app.canvas.ds?.scale) || 1) <= 0.5,
    
    fitString(ctx, str, maxWidth) {
        const width = ctx.measureText(str).width;
        const ellipsis = "…";
        const ellipsisWidth = ctx.measureText(ellipsis).width;
        
        if (width <= maxWidth || width <= ellipsisWidth) return str;
        
        let i = str.length;
        while (i > 0 && ctx.measureText(str.substring(0, i)).width + ellipsisWidth > maxWidth) {
            i--;
        }
        return str.substring(0, i) + ellipsis;
    },

    // 表示モードに対応した formatDisplayName
    formatDisplayName(fullPath, showFullPath = false, displayName = null) {
        if (displayName) return displayName;
        if (fullPath === "None") return fullPath;
        
        if (showFullPath) {
            // フルパス表示モード
            return fullPath;
        } else {
            // ファイル名のみ表示モード（既存の処理）
            const lastSlash = Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\'));
            let fName = lastSlash !== -1 ? fullPath.substring(lastSlash + 1) : fullPath;
            
            const dotIndex = fName.lastIndexOf('.');
            if (dotIndex !== -1) {
                fName = fName.substring(0, dotIndex);
            }
            
            return fName;
        }
    },

    //  --- LoRA ファイル選択ダイアログ --------------------
    useExplorer: true, // 設定にて変更可能

    async getLoRAs() {
        const apiLoras = await api_get("files/loras");
        return [...(Array.isArray(apiLoras) ? apiLoras : [])];
    },

    async showLoRAChooser(event, currentValue, callback) {
        // ファイルリストを取得
        const fileList = await this.getLoRAs();

        if (this.useExplorer) {
            this.showCustomLoRAMenu(event, fileList, currentValue, callback);
        } else {
            this.showDefaultMenu(event, fileList, currentValue, callback);
        }
    }, 

    // defualt
    async showDefaultMenu(event, fileList, currentValue, callback) {

        new LiteGraph.ContextMenu(fileList, {
            event: event,
            scale: Math.max(1, app.canvas.ds?.scale ?? 1),
            className: "dark",
            callback: (value) => {
                if (typeof value === "string") {
                    callback(value);
                }
            }
        });
    }, 
    
    // custom
    async showCustomLoRAMenu(event, fileList, currentValue, callback) {

        new LoRAExplorer(callback).show({
            fileList: fileList, 
            currentValue: currentValue
        });
    }, 

    // --- Checkpoint ファイル選択ダイアログ ---------------
    async getCheckpoints() {
        const apiCheckpoints = await api_get("files/checkpoints");
        return [...(Array.isArray(apiCheckpoints) ? apiCheckpoints : [])];
    }, 

    async showCheckpointChooser(event, currentValue, callback) {
        const fileList = await this.getCheckpoints();

        if (this.useExplorer) {
            this.showCustomCheckpointMenu(event, fileList, currentValue, callback);
        } else {
            this.showDefaultMenu(event, fileList, currentValue, callback);
        }
    }, 

    async showCustomCheckpointMenu(event, fileList, currentValue, callback) {

        new CheckpointExplorer(callback).show({
            fileList: fileList, 
            currentValue: currentValue
        });
    }, 

};


// === 描画関数 ===
export const Renderer = {
    drawPillBackground(ctx, x, y, width, height, enabled) {
        const lowQuality = Utils.isLowQuality();
        ctx.save();
        
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, lowQuality ? 0 : CONSTANTS.BORDER_RADIUS);
        
        ctx.fillStyle = enabled ? "#2d3748" : "#1a202c";
        ctx.fill();
        
        if (!lowQuality) {
            ctx.strokeStyle = enabled ? "#4a5568" : "#2d3748";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.restore();
    },

    drawToggleSwitch(ctx, x, y, height, state) { // state can be 'on', 'off', or 'indeterminate'
        const lowQuality = Utils.isLowQuality();
        const toggleWidth = 36;
        const toggleHeight = height - 8;
        const toggleY = y + 4;
        const enabled = state === 'on';
        
        ctx.save();
        
        // トグル背景
        ctx.beginPath();
        ctx.roundRect(x, toggleY, toggleWidth, toggleHeight, lowQuality ? 0 : toggleHeight / 2);
        ctx.fillStyle = enabled ? "#48bb78" : "#4a5568";
        ctx.fill();
        
        if (!lowQuality) {
            ctx.strokeStyle = enabled ? "#38a169" : "#2d3748";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // トグル円
        const circleRadius = (toggleHeight - 4) / 2;
        let circleX;
        if (state === 'on') {
            circleX = x + toggleWidth - circleRadius - 2;
        } else if (state === 'off') {
            circleX = x + circleRadius + 2;
        } else { // indeterminate
            circleX = x + toggleWidth / 2;
        }
        const circleY = toggleY + toggleHeight / 2;
        
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        
        if (!lowQuality) {
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.restore();
        return toggleWidth;
    },

    drawStrengthControl(ctx, x, y, width, height, value, enabled) {
        const lowQuality = Utils.isLowQuality();
        const arrowWidth = 12;
        const numberWidth = width - arrowWidth * 2 - 4;
        
        ctx.save();
        
        // 左矢印
        ctx.beginPath();
        ctx.roundRect(x, y, arrowWidth, height, lowQuality ? 0 : [4, 0, 0, 4]);
        ctx.fillStyle = enabled ? "#4a5568" : "#2d3748";
        ctx.fill();
        
        if (!lowQuality) {
            ctx.strokeStyle = enabled ? "#68d391" : "#4a5568";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // 左矢印アイコン
        ctx.fillStyle = enabled ? "#e2e8f0" : "#718096";
        const leftArrowX = x + arrowWidth / 2;
        const arrowY = y + height / 2;
        ctx.beginPath();
        ctx.moveTo(leftArrowX + 2, arrowY - 3);
        ctx.lineTo(leftArrowX - 2, arrowY);
        ctx.lineTo(leftArrowX + 2, arrowY + 3);
        ctx.closePath();
        ctx.fill();
        
        // 数値表示部分
        ctx.beginPath();
        ctx.roundRect(x + arrowWidth + 2, y, numberWidth, height, lowQuality ? 0 : 2);
        ctx.fillStyle = enabled ? "#4a5568" : "#2d3748";
        ctx.fill();
        
        if (!lowQuality) {
            ctx.strokeStyle = enabled ? "#68d391" : "#4a5568";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // 数値テキスト
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "11px monospace";
        ctx.fillStyle = enabled ? "#e2e8f0" : "#718096";
        ctx.fillText(value.toFixed(2), x + arrowWidth + 2 + numberWidth / 2, y + height / 2);
        
        // 右矢印
        const rightArrowX = x + arrowWidth + 2 + numberWidth + 2;
        ctx.beginPath();
        ctx.roundRect(rightArrowX, y, arrowWidth, height, lowQuality ? 0 : [0, 4, 4, 0]);
        ctx.fillStyle = enabled ? "#4a5568" : "#2d3748";
        ctx.fill();
        
        if (!lowQuality) {
            ctx.strokeStyle = enabled ? "#68d391" : "#4a5568";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // 右矢印アイコン
        ctx.fillStyle = enabled ? "#e2e8f0" : "#718096";
        const rightArrowIconX = rightArrowX + arrowWidth / 2;
        ctx.beginPath();
        ctx.moveTo(rightArrowIconX - 2, arrowY - 3);
        ctx.lineTo(rightArrowIconX + 2, arrowY);
        ctx.lineTo(rightArrowIconX - 2, arrowY + 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        return {
            leftArrow: [x, y, arrowWidth, height],
            number: [x + arrowWidth + 2, y, numberWidth, height],
            rightArrow: [rightArrowX, y, arrowWidth, height]
        };
    }
};
