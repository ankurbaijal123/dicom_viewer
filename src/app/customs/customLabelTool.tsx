"use client";

import { useEffect, useRef, useState } from "react";
import {
  getRenderingEngine,
  RenderingEngine,
  StackViewport,
  metaData,
} from "@cornerstonejs/core";
import {
  annotation,
  Types as ToolTypes,
  addTool,
  ToolGroupManager,
  ArrowAnnotateTool,
} from "@cornerstonejs/tools";
import { v4 as uuidv4 } from "uuid";

interface Props {
  viewportId: string;
  renderingEngineId: string;
  toolGroupId: string;
  cornerstoneElement: any;
}

const DoubleClickLabelTool: React.FC<Props> = ({
  viewportId,
  renderingEngineId,
  toolGroupId,
  cornerstoneElement,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputPos, setInputPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasPoint, setCanvasPoint] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!cornerstoneElement) return;

    // Register and enable ArrowAnnotate tool
    addTool(ArrowAnnotateTool);
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (toolGroup) {
      toolGroup.addTool("ArrowAnnotate");
      toolGroup.setToolEnabled("ArrowAnnotate");
      toolGroup.addViewport(viewportId, renderingEngineId);
      
    }

    const handleDoubleClick = (event: MouseEvent) => {
      const bounds = cornerstoneElement.getBoundingClientRect();
      const point: [number, number] = [
        event.clientX - bounds.left,
        event.clientY - bounds.top,
      ];

      setCanvasPoint(point);
      setInputPos({ x: event.clientX, y: event.clientY });
      setInputVisible(true);

      // Auto focus input when rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    };

    cornerstoneElement.addEventListener("dblclick", handleDoubleClick);
    return () => {
      cornerstoneElement.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [viewportId, renderingEngineId, cornerstoneElement]);

  const handleLabelSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key !== "Enter" || !canvasPoint) return;

  const label = (event.target as HTMLInputElement).value.trim();
  if (!label) return;

  console.log("Label input received:", label);

  const renderingEngine: RenderingEngine | undefined = getRenderingEngine(renderingEngineId);
  console.log("Rendering engine:", renderingEngine);
  if (!renderingEngine) return;

  const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
  console.log("Viewport object:", viewport);
  if (!viewport) return;

  const worldPos = viewport.canvasToWorld(canvasPoint);
  console.log("World position:", worldPos);
  if (!worldPos) return;

  console.log("canvasPoint:", canvasPoint);
console.log("worldPos:", worldPos);


  const imageIds = viewport.getImageIds();
  const current = viewport.getCurrentImageIdIndex();
  const imageId = imageIds[current];
  console.log("Image ID:", imageId);
  if (!imageId) return;

  const annotationUID = uuidv4();

  const newAnnotation: ToolTypes.Annotation = {
    annotationUID,
    metadata: {
      toolName: ArrowAnnotateTool.toolName,
      viewPlaneNormal: [0, 0, 1],
      viewUp: [0, 1, 0],
      referencedImageId: imageId,
      FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
    },
    highlighted: true,
    invalidated: true,
    data: {
      handles: {
        points: [worldPos],
        activeHandleIndex: null,
      },
      text: label,
      canvasPoints: [],
    },
  };

  console.log("Annotation object:", newAnnotation);

  try {
    annotation.state.addAnnotation(newAnnotation, toolGroupId);
    console.log("Annotation added to toolGroup:", toolGroupId);
  } catch (error) {
    console.error("Failed to add annotation:", error);
  }

  try {
    annotation.state.triggerAnnotationAddedForElement(newAnnotation, cornerstoneElement);
    console.log("Triggering annotation render");
  } catch (err) {
    console.error("Error triggering annotation render:", err);
  }
  viewport.render();

  setInputVisible(false);
 
};

  return (
    <>
      {inputVisible && (
        <input
          ref={inputRef}
          type="text"
          onKeyDown={handleLabelSubmit}
          placeholder="Enter label and press Enter"
          style={{
            position: "fixed",
            top: inputPos.y,
            left: inputPos.x,
            zIndex: 1000,
            padding: "4px 8px",
            fontSize: "14px",
          }}
        />
      )}
    </>
  );
};

export default DoubleClickLabelTool;
