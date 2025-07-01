declare module 'cornerstone-core';
declare module 'cornerstone-tools';
declare module 'dicom-parser';
declare module 'cornerstone-wado-image-loader';
declare module 'cornerstone-web-image-loader';


declare module 'cornerstone-core' {
  export interface Image {
    imageId: string;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    getPixelData(): Uint8Array | Uint16Array | number[];
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    render: Function;
    sizeInBytes: number;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
  }

  export function enable(element: HTMLElement): void;
  export function disable(element: HTMLElement): void;
  export function loadImage(imageId: string): Promise<Image>;
  export function displayImage(element: HTMLElement, image: Image): void;
  export function registerImageLoader(scheme: string, loader: (imageId: string) => Promise<Image>): void;
  export const renderGrayscaleImage: Function;
}
