import * as cornerstone from "cornerstone-core";

export function registerPngJpgLoader() {
  if (typeof window === "undefined") return;

  const cornerstone = require("cornerstone-core");

  console.log("📌 Registering customLoader...");

  cornerstone.registerImageLoader("customLoader", (imageId: string) => {
    const url = imageId.replace("customLoader:", "");
    console.log("📷 Loading:", url);

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixelData = new Uint8Array(imageData.data);

        const image = {
          imageId,
          minPixelValue: 0,
          maxPixelValue: 255,
          slope: 1.0,
          intercept: 0,
          windowCenter: 127,
          windowWidth: 255,
          render: cornerstone.renderGrayscaleImage,
          getPixelData: () => pixelData,
          rows: img.height,
          columns: img.width,
          height: img.height,
          width: img.width,
          color: true,
          columnPixelSpacing: 1,
          rowPixelSpacing: 1,
          sizeInBytes: pixelData.length,
        };

        resolve(image);
      };

      img.onerror = () => {
        console.error("❌ Image failed to load:", url);
        reject(new Error("Image load error"));
      };

      img.src = url;
    });
  });
}
