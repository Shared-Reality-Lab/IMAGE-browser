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
import browser from "webextension-polyfill";

/**
 * Adds explanation Link to the rendering
 * @param contentDiv container for rendering.
 * @param link added to explain the rendering.
 */
export function addRenderingExplanation(contentDiv : HTMLElement, explanationLink : string ){
    const explainDivContainer = document.createElement("p");
    const textContainer = document.createElement("a");
    let link = document.createTextNode(browser.i18n.getMessage("explainRendering"));                
    textContainer.href = explanationLink; 
    textContainer.target = "_blank";
    textContainer.appendChild(link); 
    explainDivContainer.append(textContainer)
    contentDiv.append(explainDivContainer)
}

export function createButton(contentDiv: HTMLElement, id: string, text: string ){
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
export function createCanvas(contentDiv: HTMLElement, width:number, height:number){
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.id = "main";
    canvas.width = width;
    canvas.height = height;
    canvas.style.zIndex = "8";
    canvas.style.position = "relative";
    canvas.style.border = "1px solid";
    contentDiv.append(document.createElement("br"));
    contentDiv.append(canvas);

    return canvas;
}


const pixelsPerMeter = 6000;

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
    drawingInfo: {haplyType: worker.Type, segIndex: number, subSegIndex: number},
    segments: worker.SubSegment[][],objects:worker.SubSegment[][], 
    ctx: CanvasRenderingContext2D) {

    // drawing bounding boxes and centroids
    drawBoundaries(drawingInfo, segments,objects, ctx);
    border.draw();

    //scaling end effector position to canvas
    let xE = pixelsPerMeter * (-posEE.x + 0.014);
    let yE = pixelsPerMeter * (posEE.y - 0.009);


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
 export function drawBoundaries(drawingInfo: {haplyType: worker.Type, segIndex: number, subSegIndex: number}, segments:worker.SubSegment[][],objects:worker.SubSegment[][], ctx:CanvasRenderingContext2D){
    if (drawingInfo != undefined) {
        const [i, j] = [drawingInfo['segIndex'], drawingInfo['subSegIndex']];//currentHaplyIndex;
        
        if (drawingInfo['haplyType'] == 0) {
            segments[i][j].coordinates.forEach(coord => {
                const pX = coord.x;
                const pY = coord.y;
                let [pointX, pointY] = imgToWorldFrame(pX, pY);
                ctx.strokeRect(pointX, pointY, 1, 1);
            })
        }
        else {
            objects[i][j].coordinates.forEach(coord => {
                const pX = coord.x;
                const pY = coord.y;
                let [pointX, pointY] = imgToWorldFrame(pX, pY);
                ctx.strokeRect(pointX, pointY, 1, 1);
            })
        }
    }

}

const canvasWidth = 800;
const canvasHeight = 500;
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