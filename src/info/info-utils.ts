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
import browser from "webextension-polyfill";

/**
 * Adds explanation Link to the rendering
 * @param contentDiv container for rendering.
 * @param link added to explain the rendering.
 */
export function addRenderingExplanation(contentDiv: HTMLElement, explanationLink: string) {
    const explainDivContainer = document.createElement("p");
    const textContainer = document.createElement("a");
    let link = document.createTextNode(browser.i18n.getMessage("explainRendering"));
    textContainer.href = explanationLink;
    textContainer.target = "_blank";
    textContainer.appendChild(link);
    explainDivContainer.append(textContainer)
    contentDiv.append(explainDivContainer)
}

/**
 * Adds explanation Link to the rendering
 * @param contentDiv container for rendering.
 * @param link added to explain the rendering.
 * @returns content div 
 */
export function addRenderingContent(container: HTMLElement, contentId: string){
    let div = document.createElement("div");
    div.classList.add("row");
    container.append(div);
    let contentDiv = document.createElement("div");
    contentDiv.classList.add("collapse");
    contentDiv.classList.add("rendering-content");
    contentDiv.id = contentId;
    div.append(contentDiv);
    return contentDiv;
}
/**
 * Creates a button element inside the content div, with the specified id and text
 * @param contentDiv parent div for the button
 * @param id id for the button element
 * @param text text content for the button element
 * @returns btn element
 */
export function createButton(contentDiv: HTMLElement, id: string, text: string) {
    let btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    contentDiv.append(btn);
    return btn;
}

export function createSVG(encodedString: string): SVGSVGElement{
    let svgString = encodedString && encodedString.split("data:image/svg+xml;base64,")[1];
    let domParser = new DOMParser();
    let svgDom = domParser.parseFromString(atob(svgString), "text/xml");
    let svgElement = svgDom.getElementsByTagName("svg")[0];
    svgElement.classList.add("render-svg");
    let imageChildElements = svgElement.getElementsByTagName("image");
    if(imageChildElements?.length > 0){
        let imageChildElement = imageChildElements[0];
        const width = imageChildElement.getAttribute("width");
        const height = imageChildElement.getAttribute("height");
        svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
    return svgElement 
}