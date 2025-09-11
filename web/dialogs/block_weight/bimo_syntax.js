export function applyBIMO(bimo, sliders, blockConfig) {
    if (!validateBIMO(bimo)) return;

    const mapping = {};
    
    // 各文字タイプを処理する関数
    function processCharType(charPattern, configKey) {
        const chars = bimo.match(charPattern) || [];
        if (chars.length > 0 && blockConfig[configKey]) {
            const items = blockConfig[configKey];
            const baseItemsPerChar = Math.floor(items.length / chars.length);
            const remainder = items.length % chars.length;
            
            let currentIndex = 0;
            chars.forEach((char, index) => {
                const value = char === char.toUpperCase() ? 1 : 0;
                const itemsForThisChar = baseItemsPerChar + (index < remainder ? 1 : 0);
                
                for (let i = 0; i < itemsForThisChar; i++) {
                    if (currentIndex < items.length) {
                        const key = items[currentIndex][0];
                        mapping[key] = value;
                        currentIndex++;
                    }
                }
            });
        }
    }

    
    // 各文字タイプを処理
    processCharType(/[bB]/g, 'upper');  // B -> upper
    processCharType(/[iI]/g, 'left');   // I -> left  
    processCharType(/[mM]/g, 'bottom'); // M -> bottom
    processCharType(/[oO]/g, 'right');  // O -> right
    
    // スライダーに値を適用
    sliders.forEach(slider => {
        if (mapping.hasOwnProperty(slider.key)) {
            slider.setValue(mapping[slider.key]);
        }
    });
}

function validateBIMO(bimo) {

    // b, i, m, o以外の文字が含まれていないかチェック
    const allowedChars = /^[bimo]+$/i;
    if (!allowedChars.test(bimo)) {
        alert("BIMO構文エラー: B, I, M, O以外の文字が含まれています");
        return false;
    }

    return true;
}