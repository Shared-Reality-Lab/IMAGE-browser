/*
 * Copyright (c) 2021 IMAGE Project, Shared Reality Lab, McGill University
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * and our Additional Terms along with this program.
 * If not, see <https://github.com/Shared-Reality-Lab/IMAGE-browser/LICENSE>.
 */
const closeButton : Element | null = document.getElementById('closing-button');
closeButton?.addEventListener("click", () => window.close());

const feedbackAnchor = document.getElementById("feedback-a") as HTMLAnchorElement;
if (feedbackAnchor) {
    // const urlParams = new URLSearchParams(window.location.search);
    // let request_uuid =  urlParams.get("uuid") || "";
    // let request = urlParams.get("hash") || "";
    // let serverUrl = urlParams.get("serverURL") || "";
    feedbackAnchor.href += window.location.search;
}
