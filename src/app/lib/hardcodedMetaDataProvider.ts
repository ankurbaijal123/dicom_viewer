// Add hardcoded meta data provider for color images
export default function hardcodedMetaDataProvider(type, imageId, imageIds) {
  const colonIndex = imageId.indexOf(':');
  const scheme = imageId.substring(0, colonIndex);
  if (scheme !== 'web') {
    return;
  }

  if (type === 'imagePixelModule') {
    return {
      pixelRepresentation: 0,
      bitsAllocated: 24,
      bitsStored: 24,
      highBit: 24,
      photometricInterpretation: 'RGB',
      samplesPerPixel: 3,
    };
  }

  if (type === 'generalSeriesModule') {
    return {
      modality: 'SC',
      seriesNumber: 1,
      seriesDescription: 'Color',
      seriesDate: '20190201',
      seriesTime: '120000',
      seriesInstanceUID: '1.2.276.0.7230010.3.1.4.83233.20190201120000.1',
    };
  }

  if (type === 'imagePlaneModule') {
    const index = imageIds?.indexOf(imageId) ?? 0;

    return {
      frameOfReferenceUID: '1.2.3.4.5.6.7.8.9',
      imageOrientationPatient: [1, 0, 0, 0, 1, 0], // Axial
      imagePositionPatient: [0, 0, index * 5], // 5 mm slice thickness
      pixelSpacing: [1, 1], // row, column spacing
      rowPixelSpacing: 1,
      columnPixelSpacing: 1,
      columns: 2048,
      rows: 1216,
      rowCosines: [1, 0, 0],
      columnCosines: [0, 1, 0],
      usingDefaultValues: true, // tells cornerstone tools to use pixel units
    };
  }

  if (type === 'voiLutModule') {
    return {
      windowWidth: [256],
      windowCenter: [128],
    };
  }

  if (type === 'modalityLutModule') {
    return {
      rescaleSlope: 1,
      rescaleIntercept: 0,
    };
  }



  return undefined;
}
