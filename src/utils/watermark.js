
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
                const fontSize = Math.floor(img.width / 15); // Dynamic font size
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Add rotation and diagonal repeating text
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(-Math.PI / 4);

                // Draw single large centered watermark
                ctx.fillText(text.toUpperCase(), 0, 0);

                // Optional: Draw pattern
                // ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                // for(let i = -10; i < 10; i++) { ... }

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
