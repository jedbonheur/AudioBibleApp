import tinycolor from 'tinycolor2';

/**
 * Generates a light gradient from a given base color.
 * @param {string} hexColor - Base hex color, e.g., '#123456'
 * @param {number} lightnessAmount - Optional lightening factor (0-1), default 0.3
 * @returns {string[]} - Array of two hex colors for gradient
 */
export function generateLightGradient(hexColor, lightnessAmount = 0.3) {
 const baseColor = tinycolor(hexColor);

 // Make a lighter/brighter version
 const lighterColor = baseColor.clone().lighten(lightnessAmount * 100).toHexString();

 // Return gradient array
 return [hexColor, lighterColor];
}
