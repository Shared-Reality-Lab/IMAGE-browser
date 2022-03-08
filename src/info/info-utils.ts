/*
 * Copyright (c) 2021 IMAGE Project, Shared Reality Lab, McGill University
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * and our Additional Terms along with this program.
 * If not, see <https://github.com/Shared-Reality-Lab/IMAGE-server/LICENSE>.
 */
import { Vector } from "../types/vector";
import * as worker from './worker';
import { canvasCircle } from '../types/canvas-circle';
import { canvasRectangle } from '../types/canvas-rectangle';

const pixelsPerMeter = 6000;
const canvasWidth = 800;
const canvasHeight = 500;

export function createButton(contentDiv: HTMLElement, id: string, text: string) {
    let btn = document.createElement("button");
    btn.id = id;
    btn.innerHTML = text;
    contentDiv.append(btn);
    return btn;
}

/**
 * Returns a HTML canvas of specified properties.
 * @param contentDiv container for canvas.
 * @returns Canvas with context.
 */
export function createCanvas(contentDiv: HTMLElement) {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.id = "main";
    canvas.width = 800;
    canvas.height = 500;
    canvas.style.zIndex = "8";
    canvas.style.position = "relative";
    canvas.style.border = "1px solid";
    contentDiv.append(document.createElement("br"));
    contentDiv.append(canvas);

    return canvas;
}

/**
 * Updates the canvas at each timeframe.
 * @param posEE The 2DIY workspace position.
 * @param endEffector Virtual avatar position.
 * @param deviceOrigin Starting coordinates of the 2DIY.
 * @param border Canvas border.
 * @param drawingInfo Info for segment/object to draw.
 * @param segments List of segments to draw.
 * @param objects List of objects to draw.
 * @param ctx Canvas context.
 */
export function updateAnimation(posEE: Vector,
    endEffector: canvasCircle,
    deviceOrigin: Vector,
    border: canvasRectangle,
    drawingInfo: [worker.Type, number, number],
    segments: worker.SubSegment[][], objects: worker.SubSegment[][],
    ctx: CanvasRenderingContext2D) {

    // drawing bounding boxes and centroids
    drawBoundaries(drawingInfo, segments, objects, ctx);
    border.draw();

    //scaling end effector position to canvas
    let xE = pixelsPerMeter * (-posEE.x + 0.014);
    let yE = pixelsPerMeter * ((posEE.y / 0.805) - 0.0311);

    // set position of virtual avatar in canvas
    endEffector.x = deviceOrigin.x + xE - 100;
    endEffector.y = deviceOrigin.y + yE - 167;
    endEffector.draw();
}

/**
 * Draw segment/object boundaries.
 * @param drawingInfo Info for segment/object to draw.
 * @param segments List of segments to draw.
 * @param objects List of objects to draw.
 * @param ctx 
 */
export function drawBoundaries(drawingInfo: { haplyType: worker.Type, segIndex: number, subSegIndex: number },
    segments: worker.SubSegment[][], objects: worker.SubSegment[][],
    ctx: CanvasRenderingContext2D) {
    if (drawingInfo != undefined) {

        // subsegment and segment index
        const [i, j] = [drawingInfo['segIndex'], drawingInfo['subSegIndex']];
        ctx.lineWidth = 4;

        // segments
        if (drawingInfo['haplyType'] == 0) {
            ctx.strokeStyle = "blue";
            if (segments[i][j] != undefined) {
                segments[i][j].coordinates.forEach(coord => {
                    const pX = coord.x;
                    const pY = coord.y;
                    let [pointX, pointY] = imgToWorldFrame(pX, pY);
                    ctx.strokeRect(pointX, pointY, 1, 1);
                })
            }      
        }

        // objects
        else if (drawingInfo['haplyType'] == 1) {
            ctx.strokeStyle = "orange";
            if (objects[i][j] != undefined) {
                objects[i][j].coordinates.forEach(coord => {
                    const pX = coord.x;
                    const pY = coord.y;
                    let [pointX, pointY] = imgToWorldFrame(pX, pY);

                    // bigger size for single point objects
                    const size = objects[i][j].coordinates.length == 1 ? 20 : 1
                    ctx.strokeRect(pointX, pointY, size, size);
                })
            }
        }
    }

}

/**
 * Converts 2DIY coordinates to Canvas frame of reference coords.
 * @param x1 x position in the normalized 0 -> 1 coordinate system
 * @param y1 y position in the normalized 0 -> 1 coordinate system
 * @returns Tuple containing the [x, y] position for the canvas
 */
export function imgToWorldFrame(x1: number, y1: number): [number, number] {
    const x = x1 * canvasWidth;
    const y = y1 * canvasHeight;
    return [x, y]
}