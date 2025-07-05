// components/LabelToolUI.tsx
"use client";

import React, { useState } from "react";
import { getEnabledElementByViewportId, utilities, metaData } from "@cornerstonejs/core";
import { annotation, LabelTool } from "@cornerstonejs/tools";
import type { Point3 } from "@cornerstonejs/core/types";
import uuidv4 from "@cornerstonejs/core/utilities/uuidv4";

const VIEWPORT_ID = "myViewport";

export default function LabelToolUI() {
  const [imageI, setImageI] = useState(10);
  const [imageJ, setImageJ] = useState(10);
  const [imageText, setImageText] = useState("");

  function addAnnotation() {
    const enabledElement = getEnabledElementByViewportId(VIEWPORT_ID);
    if (!enabledElement) {
      alert("Viewport not found: " + VIEWPORT_ID);
      return;
    }
    const viewport = enabledElement.viewport;

    const coords: [number, number] = [imageI, imageJ];
    const text = imageText;
    const currentImageId = viewport.getCurrentImageId() as string;

    if (!currentImageId) {
      alert("Current image ID is invalid.");
      return;
    }

    if (coords.some(isNaN)) {
      alert("Coordinates contain invalid numbers.");
      return;
    }

    // Check required metadata exists before conversion
    const imagePlaneMetadata = metaData.get("imagePlaneModule", currentImageId);
    console.log(currentImageId, imagePlaneMetadata);
    if (
      !imagePlaneMetadata
    ) {
      alert(
        "Required imagePlaneModule metadata missing! Cannot convert image coords to world coords."
      );
      return;
    }

    const position: Point3 | undefined = utilities.imageToWorldCoords(currentImageId, coords);

    if (!position) {
      alert("Failed to convert image coords to world coords.");
      return;
    }

    function addAnnotation() {
      const enabledElement = getEnabledElementByViewportId(VIEWPORT_ID);
      if (!enabledElement) {
        alert("Viewport not found: " + VIEWPORT_ID);
        return;
      }
      const viewport = enabledElement.viewport;

      const coords: [number, number] = [imageI, imageJ];
      const currentImageId = viewport.getCurrentImageId() as string;

      if (!currentImageId) {
        alert("Current image ID is invalid.");
        return;
      }

      const imagePlaneMetadata = metaData.get("imagePlaneModule", currentImageId);
      if (!imagePlaneMetadata) {
        alert("Missing image plane metadata.");
        return;
      }

      const position = utilities.imageToWorldCoords(currentImageId, coords);
      if (!position) {
        alert("Failed to convert image coords to world coords.");
        return;
      }
      const annotationUID = uuidv4();


      annotation.state.addAnnotation({
        annotationUID,
        toolName: LabelTool.toolName,
        metadata: {
          toolName: LabelTool.toolName,
          viewPlaneNormal: viewport.getCamera().viewPlaneNormal,
          viewUp: viewport.getCamera().viewUp,
          FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
          referencedImageId: currentImageId,
        },
        data: {
          text: imageText,
          handles: {
            points: [position],
            activeHandleIndex: null,
          },
        },
      },
        "default");

      viewport.render();
    }

    viewport.render();
  }

  return (
    <form style={{ marginBottom: 10, color: "white" }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 20 }}>Image Coords: Start [i, j]:</label>
        <input
          type="number"
          style={{ width: 50, marginRight: 8 }}
          value={imageI}
          onChange={(e) => setImageI(Number(e.target.value))}
          placeholder="i"
        />
        <input
          type="number"
          style={{ width: 50, marginRight: 8 }}
          value={imageJ}
          onChange={(e) => setImageJ(Number(e.target.value))}
          placeholder="j"
        />
        <label style={{ marginLeft: 30, marginRight: 10 }}>Text:</label>
        <input
          type="text"
          style={{ width: 150 }}
          value={imageText}
          onChange={(e) => setImageText(e.target.value)}
          placeholder="Annotation text"
        />
        <br />
        <button
          type="button"
          style={{ marginTop: 8, padding: "4px 10px", cursor: "pointer" }}
          onClick={addAnnotation}
        >
          Add Annotation
        </button>
      </div>
    </form>
  );
}
