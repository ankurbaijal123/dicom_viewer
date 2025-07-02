"use client";

import { useEffect, useRef, useState } from "react";
import * as cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstoneMath from "cornerstone-math";
import dicomParser from "dicom-parser";
import Hammer from "hammerjs";

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.external.cornerstoneMath = cornerstoneMath;
cornerstoneWADOImageLoader.configure({
  useWebWorkers: true,
  webWorkerPath: "/cornerstone/worker.js",
});
cornerstoneTools.init({
  showSVGCursors: true,
});
export default function HomePageComponent() {
  const elementRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const element = elementRef.current!;
    cornerstone.enable(element);

    // Initialize WADO Loader Web Worker
    cornerstoneWADOImageLoader.webWorkerManager.initialize({
      maxWebWorkers: navigator.hardwareConcurrency || 1,
      startWebWorkersOnDemand: true,
      webWorkerPath:
        "https://unpkg.com/cornerstone-wado-image-loader@4.23.1/dist/cornerstoneWADOImageLoaderWebWorker.js",
      taskConfiguration: {
        decodeTask: {
          codecsPath:
            "https://unpkg.com/cornerstone-wado-image-loader@4.23.1/dist/cornerstoneWADOImageLoaderCodecs.js",
        },
      },
    });

    const imageId = "wadouri:/image.dcm";
    cornerstone.loadImage(imageId).then((image: any) => {
      cornerstone.displayImage(element, image);

      cornerstoneTools.addTool(cornerstoneTools.ZoomMouseWheelTool);
      cornerstoneTools.addTool(cornerstoneTools.PanTool);
      cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
      cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
      cornerstoneTools.addTool(cornerstoneTools.LengthTool);
      cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool, {
        configuration: {
          renderHandle: false, 
        },
      });
      cornerstoneTools.addTool(cornerstoneTools.AngleTool);
      cornerstoneTools.toolColors.setToolColor("rgb(255, 255, 0)");
      cornerstoneTools.toolStyle.setToolWidth(2);
      //cornerstoneTools.toolStyle.setToolDash([4, 2])

      setLoaded(true);
    });

    return () => {
      cornerstone.disable(element);
    };
  }, []);

  const handleToolChange = (toolName: string) => {
    cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
    if (toolName === "zoom") {
      cornerstoneTools.setToolActive("ZoomMouseWheel", {});
    }
    console.log(toolName + " using");
  };

  const handleReset = () => {
    if (elementRef.current) {
      cornerstone.reset(elementRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">DICOM Viewer</h1>

      {loaded && (
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleToolChange("RectangleRoi")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Rectangle
          </button>
          <button
            onClick={() => handleToolChange("Pan")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Pan
          </button>
          <button
            onClick={() => handleToolChange("zoom")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Zoom
          </button>
          <button
            onClick={() => handleToolChange("Wwwc")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Brightness
          </button>
          <button
            onClick={() => handleToolChange("Length")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Length
          </button>
          <button
            onClick={() => handleToolChange("EllipticalRoi")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Ecllipse
          </button>
          <button
            onClick={() => handleToolChange("Angle")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Angle
          </button>
          <button
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>
      )}

      <div
        ref={elementRef}
        className="w-[512px] h-[512px] border border-gray-500 bg-black touch-none"
      />
    </div>
  );
}
