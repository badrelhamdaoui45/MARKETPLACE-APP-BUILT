
/**
 * Adds a watermark to an image file.
 * @param {File} file - The image file to watermark.
 * @param {string} text - The text to watermark (e.g. "PREVIEW").
 * @returns {Promise<Blob>} - A promise that resolves to the watermarked image Blob.
 */
export const watermarkImage = (file, text = "PREVIEW - PhotoMarket") => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set canvas dimensions to match image
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw original image
                ctx.drawImage(img, 0, 0);

                // Configure watermark style
                // USER REQUEST: Repeating pattern logic based on uploaded reference (Re-applied)

                // Set font style
                const fontSize = Math.floor(img.width * 0.05); // 5% of width
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // White with transparency
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Add shadow for better visibility
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Pattern settings
                const angle = -Math.PI / 4; // -45 degrees
                const spacingX = img.width * 0.25; // Closer horizontal spacing
                const spacingY = img.width * 0.25; // Closer vertical spacing

                // Calculate diagonal coverage
                const diag = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);

                ctx.save();

                // Loop through a large enough grid to cover the canvas at any rotation
                for (let y = -diag; y < diag * 2; y += spacingY) {
                    for (let x = -diag; x < diag * 2; x += spacingX) {
                        ctx.save();

                        // Add offset for "brick" pattern look
                        const offsetX = (Math.floor(y / spacingY) % 2 === 0) ? 0 : spacingX / 2;

                        // Translate to position, then rotate
                        ctx.translate(x + offsetX, y);
                        ctx.rotate(angle);
                        ctx.fillText(text.toUpperCase(), 0, 0);

                        ctx.restore();
                    }
                }

                ctx.restore();

                // Convert to Blob
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob failed'));
                }, 'image/jpeg', 0.85);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
