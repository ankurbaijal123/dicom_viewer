"use client";
import { useEffect, useRef, useState } from "react";
import {
    RenderingEngine,
    Enums,
    imageLoader,
    metaData,
    StackViewport,
    init as cornerstoneCoreInit,
} from "@cornerstonejs/core";
import {
    init as cornerstoneToolsInit,
    ToolGroupManager,
    Enums as csToolsEnums,
    addTool,
    PanTool,
    ZoomTool,
    WindowLevelTool,
    LengthTool,
    RectangleROITool,
    EllipticalROITool,
    AngleTool,
    annotation,
} from "@cornerstonejs/tools";
import hardcodedMetaDataProvider from "../lib/hardcodedMetaDataProvider";
import registerLoader from "@cornerstonejs/dicom-image-loader";

const renderingEngineId = "myRenderingEngine";
const viewportId = "myViewport";
const toolGroupId = "myToolGroup";
export default function DicomViewer() {
    const elementRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    const renderingEngineRef = useRef<RenderingEngine | null>(null);
    const [frameIndex, setFrameIndex] = useState(0);
    const [frameCount, setFrameCount] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(24);
    const playIntervalRef = useRef(null);


    const fetchDicomFile = async () => {
        const response = await fetch("/dicom_1.dcm");
        return await response.blob();
    };
    useEffect(() => {
        const initialize = async () => {
            try {
                const { init: dicomLoaderInit, wadouri } = await import(
                    "@cornerstonejs/dicom-image-loader"
                );
                await cornerstoneCoreInit();
                await dicomLoaderInit();
                await cornerstoneToolsInit();

                metaData.addProvider(
                    (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageId),
                    10000
                );

                if (!elementRef.current) return;
                const element = elementRef.current;
                const renderingEngine = new RenderingEngine(renderingEngineId);
                renderingEngineRef.current = renderingEngine;
                renderingEngine.setViewports([
                    {
                        viewportId,
                        type: Enums.ViewportType.STACK,
                        element,
                    },
                ]);

                const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
                const imageBlob = await fetchDicomFile();
                const baseImageId = wadouri.fileManager.add(imageBlob);

                await imageLoader.loadImage(baseImageId);

                const metadata = metaData.get("multiframeModule", baseImageId);
                console.log("Multiframe metadata:", metadata);

                if (!metadata || typeof metadata.NumberOfFrames !== "number" || metadata.NumberOfFrames <= 0) {
                    throw new Error("Invalid or missing NumberOfFrames in metadata");
                }

                const numberOfFrames = metadata.NumberOfFrames;
                setFrameCount(numberOfFrames);



                const imageIds = [];
                for (let i = 0; i < numberOfFrames; i++) {
                    imageIds.push(`${baseImageId}?frame=${i}`);
                }

                await viewport.setStack(imageIds);
                viewport?.setImageIdIndex(1);

                viewport.render(); // 👈 Force render first frame


                [
                    PanTool,
                    ZoomTool,
                    WindowLevelTool,
                    LengthTool,
                    RectangleROITool,
                    EllipticalROITool,
                    AngleTool,
                ].forEach(addTool);

                const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
                if (!toolGroup) return;

                [
                    PanTool,
                    ZoomTool,
                    WindowLevelTool,
                    LengthTool,
                    RectangleROITool,
                    EllipticalROITool,
                    AngleTool,
                ].forEach((Tool) => {
                    toolGroup.addTool(Tool.toolName);
                });

                toolGroup.addViewport(viewportId, renderingEngineId);
                setLoaded(true);
            } catch (error) {
                console.error("Initialization error:", error);
                alert("Runtime Error:\n" + JSON.stringify(error, null, 2));
            }
        };

        initialize();
        

        return () => {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
            }
        };


    }, []);

  useEffect(() => {
  if (!isPlaying) {
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    return;
  }

  playIntervalRef.current = setInterval(() => {
    setFrameIndex((prevIndex) => {
      if (prevIndex + 1 >= frameCount) {
        setIsPlaying(false); // pause at end
        return prevIndex;     // stay on last frame
      }
      const nextIndex = prevIndex + 1;

      const viewport = renderingEngineRef.current?.getViewport(viewportId);
      if (viewport) {
        viewport.setImageIdIndex(nextIndex);
        viewport.render();
      }
      return nextIndex;
    });
  }, 1000 / speed);

  return () => {
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
  };
}, [isPlaying, speed, frameCount]);


  const handlePlay = () => {
    if (!isPlaying) setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleSpeedChange = (num: number) => {
    setSpeed(num);
  };

    const handleToolChange = (selectedToolName: string) => {
        const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
        if (!toolGroup) return;
        const allTools = [
            PanTool.toolName,
            ZoomTool.toolName,
            WindowLevelTool.toolName,
            LengthTool.toolName,
            RectangleROITool.toolName,
            EllipticalROITool.toolName,
            AngleTool.toolName,
        ];
        allTools.forEach((toolName) => {
            if (toolName === selectedToolName) {
                toolGroup.setToolActive(toolName, {
                    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
                });
            } else {
                toolGroup.setToolPassive(toolName);
            }
        });
        const viewport = renderingEngineRef.current?.getViewport(viewportId);
        viewport?.render();
    };

   
    const handleFrameChange = (index: number) => {
        const viewport = renderingEngineRef.current?.getViewport(
            viewportId
        ) as StackViewport;
        if (index >= 0 && index < frameCount) {
            viewport?.setImageIdIndex(index);
            viewport?.render();
            setFrameIndex(index);
        }

    };


    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-black text-white">
            <div className="w-full flex flex-col items-center max-w-5xl p-4">


                <div
                    ref={elementRef}
                    className="w-full h-130 aspect-video bg-gray-900 border border-gray-700"
                />

                {/* Timeline & Scrubber */}
                {frameCount > 1 && (
                    <div className="relative w-full my-3">
                        <input
                            type="range"
                            min={0}
                            max={frameCount - 1}
                            value={frameIndex}
                            onChange={(e) => handleFrameChange(Number(e.target.value))}
                            className="w-full appearance-none h-2 rounded-full bg-gray-600 outline-none"
                        />
                        <div className=" left-1/2 -translate-x-1/2 top-1 text-xs text-center">
                            {("00" + Math.floor(frameIndex / 24)).slice(-2)}:
                            {("00" + (frameIndex % 24)).slice(-2)}
                        </div>

                    </div>

                )}

                {/* Player Controls */}
                <div className="w-full flex justify-between items-center gap-2 px-2">
                    {/* Left */}
                    <div className="flex items-center gap-2">

                    </div>

                    {/* Center Controls */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleFrameChange(frameIndex - 1)}
                            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            Prev
                        </button>
                        <button
                            onClick={handlePlay}
                            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            Play
                        </button>
                        <button
                            onClick={handlePause}
                            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            Pause
                        </button>
                        <button
                            onClick={() => handleFrameChange(frameIndex + 1)}
                            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            Next
                        </button>
                        <select
                            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
                            defaultValue="25"
                            onChange={(e) => handleSpeedChange(Number(e.target.value))}
                        >
                            <option value="15">0.5x</option>
                            <option value="25">1x</option>
                            <option value="30">1.5x</option>
                            <option value="60">2x</option>
                        </select>

                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">

                    </div>
                </div>

                {/* Tools */}
                <div className="flex flex-wrap justify-center gap-3 mt-6 mb-2">
                    {[PanTool, ZoomTool, LengthTool, RectangleROITool, EllipticalROITool, AngleTool, WindowLevelTool].map((Tool) => (
                        <button
                            key={Tool.toolName}
                            onClick={() => handleToolChange(Tool.toolName)}
                            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            {Tool.toolName}
                        </button>
                    ))}
                </div>

                {/* Measurement log */}
                <button
                    onClick={() => {
                        const ann = annotation.state.getAllAnnotations();
                        console.log(ann);
                    }}
                    className="mt-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-500"
                >
                    Get Measurements
                </button>
            </div>
        </div>
    );


}