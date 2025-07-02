"use client";
import { useEffect, useRef, useState } from "react";
import {
  RenderingEngine,
  Enums as e,
  StackViewport,
  imageLoader,
  metaData,
  init as coreInit,
} from "@cornerstonejs/core";
import {
  init as dicomImageLoaderInit,
  wadouri,
} from "@cornerstonejs/dicom-image-loader";
import {
  ToolGroupManager,
  Enums,
  addTool,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  LengthTool,
  RectangleROITool,
  EllipticalROITool,
  AngleTool,
  init as cornerstoneToolsInit,
} from "@cornerstonejs/tools";
import dicomParser from "dicom-parser";
import hardcodedMetaDataProvider from "../lib/hardcodedMetaDataProvider";
import { MouseBindings } from "@cornerstonejs/tools/enums/ToolBindings";
const renderingEngineId = "engine1";
const viewportId = "viewport1";
const toolGroupId = "toolGroup1";
export default function HomePageComponent() {
  const elementRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const fetchFile = async () => {
    const file = await fetch("/image.dcm");
    return await file.blob();
  };
  useEffect(() => {
    const initi = async () => {
      if (!elementRef.current) return;
      
      coreInit();
      dicomImageLoaderInit();
      cornerstoneToolsInit();
      const element = elementRef.current!;
      const imageBlob = await fetchFile();
      const imageId = wadouri.fileManager.add(imageBlob);
      metaData.addProvider(
        (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageId),
        10000
      );
      
      const renderingEngine = new RenderingEngine(renderingEngineId);
      renderingEngine.setViewports([
        {
          viewportId,
          type: e.ViewportType.STACK,
          element,
        },
      ]);
      const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
      console.log(viewport)

      await viewport.setStack([imageId], 0);
      
      // Register tools
      addTool(PanTool);
      addTool(ZoomTool);
      addTool(WindowLevelTool);
      addTool(LengthTool);
      addTool(RectangleROITool);
      addTool(EllipticalROITool);
      addTool(AngleTool);
      const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
      if(!toolGroup) return
      
      toolGroup.addTool(PanTool.toolName);
      toolGroup.addTool(ZoomTool.toolName);
      toolGroup.addTool(WindowLevelTool.toolName);
      toolGroup.addTool(LengthTool.toolName);
      toolGroup.addTool(RectangleROITool.toolName);
      toolGroup.addTool(EllipticalROITool.toolName);
      toolGroup.addTool(AngleTool.toolName);
      toolGroup.addViewport(viewportId, renderingEngineId);
      await viewport.render();
      viewport.resize()
      setLoaded(true);
    };
    initi();
  }, []);
  const handleToolChange = (toolName: string) => {
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) return;
    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary, }],
    });
  };
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">DICOM Viewer</h1>
      {loaded && (
        <div className="flex gap-4 mb-4 flex-wrap justify-center">
          <button
            onClick={() => handleToolChange(RectangleROITool.toolName)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Rectangle
          </button>
          <button
            onClick={() => handleToolChange(PanTool.toolName)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Pan
          </button>
          <button
            onClick={() => handleToolChange(ZoomTool.toolName)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Zoom
          </button>
          <button
            onClick={() => handleToolChange(WindowLevelTool.toolName)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Brightness
          </button>
          <button
            onClick={() => handleToolChange(LengthTool.toolName)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Length
          </button>
          <button
            onClick={() => handleToolChange(EllipticalROITool.toolName)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Ellipse
          </button>
          <button
            onClick={() => handleToolChange(AngleTool.toolName)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Angle
          </button>
        </div>
      )}
      <div
        ref={elementRef}
        className="w-[512px] h-[512px] border border-gray-500 bg-black"
      />
    </div>
  );
}
