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
import browser from "webextension-polyfill";

const closeButton : Element | null = document.getElementById('closingButton');
closeButton?.addEventListener("click", () => window.close());

const feedbackAnchor = document.getElementById("feedbackFormLink") as HTMLAnchorElement;
if (feedbackAnchor) {
    feedbackAnchor.href += window.location.search;
}

// Set up localized names: getting all elements with class "localisation"
const localisation = Array.from(document.querySelectorAll(".localisation"));
for (let label of localisation) {
  const val = browser.i18n.getMessage(label.id);
  if (val) {
    label.textContent = val;
  } else {
    console.warn('Unknown element "' + label.id + '"');
  }
}