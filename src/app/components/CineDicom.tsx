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
    LabelTool,
    MagnifyTool,
} from "@cornerstonejs/tools";

import hardcodedMetaDataProvider from "../lib/hardcodedMetaDataProvider";
import { viewport } from "@cornerstonejs/tools/utilities";

const renderingEngineId = "myRenderingEngine";
const viewportId = "myViewport";
const toolGroupId = "myToolGroup";

export default function DicomViewer() {
    const elementRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    const renderingEngineRef = useRef<RenderingEngine | null>(null);
    const [frameIndex, setFrameIndex] = useState(1);
    const [frameCount, setFrameCount] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [cornerstoneElement, setCornerstoneElement] = useState<any>(null);
    const [labelInputVisible, setLabelInputVisible] = useState(false);
    const [labelInputCoords, setLabelInputCoords] = useState({ x: 0, y: 0 });
    const [labelInputValue, setLabelInputValue] = useState("");
    const prevToolRef = useRef<string | null>(null);
    // Accepts null or Point3 (number[] of length 3)
    const currentWorldPosRef = useRef<number[] | null>(null);
    const currentImageIdRef = useRef<string | null>(null);

    useEffect(() => {
        const element = document.getElementById("cornerstoneDiv");
        setCornerstoneElement(element);
    }, []);

    const fetchDicomFile = async () => {
        const response = await fetch("/dicom_1.dcm");
        return await response.blob();
    };

    const handleFlip = (type: string) => {
        const viewport = renderingEngineRef.current?.getViewport(
            viewportId
        ) as StackViewport;

        const { flipVertical, flipHorizontal } = viewport.getCamera();

        viewport.setCamera({
            flipHorizontal: type === "HFlip" ? !flipHorizontal : flipHorizontal,
            flipVertical: type === "VFlip" ? !flipVertical : flipVertical,
        });
        viewport.render();
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

                const viewport = renderingEngine.getViewport(
                    viewportId
                ) as StackViewport;
                const imageBlob = await fetchDicomFile();
                const baseImageId = wadouri.fileManager.add(imageBlob);

                await imageLoader.loadImage(baseImageId);

                const metadata = metaData.get("multiframeModule", baseImageId);
                if (
                    !metadata ||
                    typeof metadata.NumberOfFrames !== "number" ||
                    metadata.NumberOfFrames <= 0
                ) {
                    throw new Error("Invalid or missing NumberOfFrames in metadata");
                }

                const numberOfFrames = metadata.NumberOfFrames;
                setFrameCount(numberOfFrames);

                const imageIds = [];
                for (let i = 0; i < numberOfFrames; i++) {
                    imageIds.push(`${baseImageId}?frame=${i + 1}`);
                }

                await viewport.setStack(imageIds);
                viewport.setImageIdIndex(1);
                viewport.render();

                [
                    PanTool,
                    ZoomTool,
                    WindowLevelTool,
                    LengthTool,
                    RectangleROITool,
                    EllipticalROITool,
                    AngleTool,
                    LabelTool,
                    MagnifyTool,
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
                    LabelTool,
                ].forEach((Tool) => {
                    toolGroup.addTool(Tool.toolName);
                });

                toolGroup.addTool(MagnifyTool.toolName, {
                    configuration: {
                        magnificationLevel: 1,
                        elementRadius: 70,
                    },
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

    // 💡 DOUBLE CLICK ADD LABEL TOOL
    useEffect(() => {
        if (!cornerstoneElement || !loaded) return;

        const handler = (event: MouseEvent) => {
            const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
            const viewport = renderingEngineRef.current?.getViewport(viewportId) as StackViewport;
            if (!viewport || !toolGroup) return;

            const canvas = viewport.getCanvas();
            const rect = canvas.getBoundingClientRect();
            const coords: [number, number] = [
                event.clientX - rect.left,
                event.clientY - rect.top,
            ];

            const worldPos = viewport.canvasToWorld(coords);
            const imageId = viewport.getCurrentImageId();

            currentWorldPosRef.current = worldPos;
            currentImageIdRef.current = imageId;
            setLabelInputCoords({ x: event.clientX, y: event.clientY });
            setLabelInputValue(""); // clear any previous input
            setLabelInputVisible(true);
        };

        cornerstoneElement.addEventListener("dblclick", handler);
        console.log("✅ Double-click handler attached");

        return () => {
            cornerstoneElement.removeEventListener("dblclick", handler);
        };
    }, [cornerstoneElement, loaded]);


    useEffect(() => {
        if (!isPlaying) {
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
            return;
        }

        playIntervalRef.current = setInterval(() => {
            setFrameIndex((prevIndex) => {
                if (prevIndex + 1 >= frameCount) {
                    setIsPlaying(false);
                    return 0;
                }
                const nextIndex = prevIndex + 1;
                const viewport = renderingEngineRef.current?.getViewport(
                    viewportId
                ) as StackViewport;

                if (viewport) {
                    viewport.setImageIdIndex(nextIndex);
                    viewport.render();
                }
                return nextIndex;
            });
        }, (1000 / 30) / speed);

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
        prevToolRef.current = selectedToolName;
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
            LabelTool.toolName,
            MagnifyTool.toolName,
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
            viewport.setImageIdIndex(index);
            viewport.render();
            setFrameIndex(index);
        }
    };

    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-black text-white">
            <div className="w-full flex flex-col items-center max-w-5xl p-4">
                <div className="text-2xl font-bold">DICOM Viewer</div>

                <div
                    id="cornerstoneDiv"
                    ref={elementRef}
                    className="w-full h-full aspect-video bg-gray-900 border border-gray-700"
                />
                {labelInputVisible && (
                    <div
                        style={{
                            position: "fixed",
                            top: labelInputCoords.y,
                            left: labelInputCoords.x,
                            zIndex: 1000,
                        }}
                    >
                        <input
                            type="text"
                            className="w-48 px-3 py-1 border border-white rounded-md text-yellow-400 placeholder-yellow-300 bg-transparent font-['Roboto'] text-sm focus:outline-none focus:ring-1 focus:ring-white"
                            style={{ color: '#FFFF00' }}
                            value={labelInputValue}
                            autoFocus
                            placeholder="Enter label and press Enter"
                            onChange={(e) => setLabelInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const worldPos = currentWorldPosRef.current;
                                    const imageId = currentImageIdRef.current;
                                    const viewport = renderingEngineRef.current?.getViewport(viewportId);
                                    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
                                    if (!labelInputValue || !imageId || !worldPos || !viewport || !toolGroup) return;
                                    
                                    annotation.state.addAnnotation(
                                        {
                                            metadata: {
                                                toolName: LabelTool.toolName,
                                                viewPlaneNormal: viewport.getCamera().viewPlaneNormal,
                                                viewUp: viewport.getCamera().viewUp,
                                                referencedImageId: imageId,
                                            },
                                            data: {
                                                text: labelInputValue,
                                                handles: {
                                                    points: [worldPos as any],
                                                    activeHandleIndex: null,
                                                },
                                            },
                                        },
                                        LabelTool.toolName
                                    );

                                    toolGroup.setToolActive(LabelTool.toolName, {
                                        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
                                    });
                                    const previousTool = prevToolRef.current
                                    // Remove active bindings so tool is not active anymore
                                    toolGroup.setToolPassive(LabelTool.toolName);
                                    if (previousTool && previousTool !== LabelTool.toolName) {
                                        toolGroup.setToolActive(previousTool, {
                                            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
                                        });
                                    }



                                    viewport.render();
                                    //toolGroup.setToolPassive(LabelTool.toolName);
                                    setLabelInputVisible(false);
                                }
                            }}
                            onBlur={() => setLabelInputVisible(false)}
                        />
                    </div>
                )}


                {frameCount > 1 && (
                    <div className="relative w-full my-3">
                        <input
                            type="range"
                            min={0}
                            max={frameCount - 1}
                            value={frameIndex - 1}
                            onChange={(e) => handleFrameChange(Number(e.target.value))}
                            className="w-full appearance-none h-2 rounded-full bg-gray-600 outline-none"
                        />
                        <div className="left-1/2 -translate-x-1/2 top-1 text-xs text-center">
                            {("00" + Math.floor(frameIndex / 24)).slice(-2)}:
                            {("00" + (frameIndex % 24)).slice(-2)}
                        </div>
                    </div>
                )}

                <div className="w-full flex justify-between items-center gap-2 px-2">
                    <div className="flex items-center gap-2"></div>

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
                            defaultValue="1"
                            onChange={(e) => handleSpeedChange(Number(e.target.value))}
                        >
                            <option value="0.5">0.5x</option>
                            <option value="1">1x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 mt-6 mb-2">
                    {[
                        PanTool,
                        ZoomTool,
                        LengthTool,
                        RectangleROITool,
                        EllipticalROITool,
                        AngleTool,
                        WindowLevelTool,
                        MagnifyTool,
                    ].map((Tool) => (
                        <button
                            key={Tool.toolName}
                            onClick={() => handleToolChange(Tool.toolName)}
                            className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            {Tool.toolName}
                        </button>
                    ))}
                </div>

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
